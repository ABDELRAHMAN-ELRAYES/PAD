import { NextFunction } from "express";
import IterationRepository from "./iteration.repository";
import {
    IIterationSession,
    IIterationMessage,
    IIterationSuggestion,
} from "./types/IIteration";
import AppError from "@/utils/app-error";
import SocketService from "../../services/socket.service";
import AiService from "../ai/ai.service";

// Phase 2: Intent classification, context building, dual prompts
import { classifyIntent, IterationIntent } from "./iteration-intent.classifier";
import IterationContextBuilder from "./iteration-context.builder";
import { buildDiscussionPrompt } from "../ai/prompts/iteration-discussion.prompt";

// Change Planner Service
import ChangePlannerService from "./change-planner.service";

// Artifact Update Engine — extracted apply logic with validation + proper REGENERATE
import ArtifactUpdateEngine, { ActionInput } from "./artifact-update-engine";

export default class IterationService {
    constructor() {
    }

    static async getOrCreateSession(ideaId: string, _: NextFunction): Promise<IIterationSession | void> {
        const repo = IterationRepository.getInstance();
        let session = await repo.getSessionByIdeaId(ideaId);

        if (!session) {
            session = await repo.createSession({ ideaId });
            // Emit to room only (not all clients) to avoid cross-tenant leaks
            SocketService.getInstance().emitToRoom(ideaId, "session:created", session);
        }

        return session;
    }

    static async addMessage(ideaId: string, role: "user" | "assistant", content: string, next: NextFunction): Promise<IIterationMessage | void> {
        const repo = IterationRepository.getInstance();
        const session = await this.getOrCreateSession(ideaId, next);
        if (!session) return;

        const message = await repo.addMessage({
            sessionId: session.id,
            role,
            content
        });

        SocketService.getInstance().emitToRoom(ideaId, "message:new", message);

        if (role === "user") {
            // Trigger AI processing in background (not awaited — REST responds immediately)
            this.processFeedbackInBackground(ideaId, session.id, content);
        }

        return message;
    }

    private static async processFeedbackInBackground(ideaId: string, sessionId: string, feedback: string) {
        const socket = SocketService.getInstance();
        socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "thinking" });
        try {
            const repo = IterationRepository.getInstance();

            // 1. Classify intent
            const intent: IterationIntent = await classifyIntent(feedback);
            console.log(`[Iteration] Intent: ${intent} | message: "${feedback.substring(0, 80)}"`);

            // 2. Build context — pass user message for artifact reference resolution
            const context = intent === "discussion"
                ? await IterationContextBuilder.buildSummaryContext(ideaId, feedback)
                : await IterationContextBuilder.buildTargetedContext(ideaId, feedback);
            const contextStr = IterationContextBuilder.serialize(context);
            console.log(`[Iteration] Context built: ${contextStr.length} chars`);

            // 3. Get conversation history
            const history = (await repo.getMessagesBySessionId(sessionId)).map(m => ({
                role: m.role,
                content: m.content
            }));

            if (intent === "modification") {
                socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "planning" });
                const plan = await ChangePlannerService.generatePlan(ideaId, sessionId, feedback);

                const explanationText = plan.explanation || `I've prepared a modification plan to update your project artifacts. Please review the details below.`;
                const aiMessage = await repo.addMessage({
                    sessionId,
                    role: "assistant",
                    content: explanationText.trim()
                });

                socket.emitToRoom(ideaId, "message:new", aiMessage);
                socket.emitToRoom(ideaId, "plan:created", { plan });
                socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "idle" });
                return;
            }

            // 4. Build prompt based on intent (discussion only)
            const prompt = buildDiscussionPrompt(contextStr, history, feedback);

            // 5. Stream LLM response
            let fullResponseText = "";
            let chunkCount = 0;
            let isGenerating = false;
            
            for await (const chunk of AiService.callLLMStream(prompt)) {
                if (!isGenerating) {
                    socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "generating" });
                    isGenerating = true;
                }
                
                fullResponseText += chunk;
                chunkCount++;

                // Stream only human-readable text to client (strip JSON blocks during streaming)
                const displayText = this.extractDisplayText(fullResponseText);
                socket.emitToRoom(ideaId, "message:stream", {
                    sessionId,
                    chunk,
                    fullText: displayText,
                    type: "chunk"
                });
            }
            console.log(`[Iteration] Stream done: ${chunkCount} chunks, ${fullResponseText.length} chars total`);
            
            socket.emitToRoom(ideaId, "message:stream", {
                sessionId,
                fullText: this.extractDisplayText(fullResponseText),
                type: "done"
            });

            // 6. Process completed response
            await this.handleDiscussionResponse(repo, socket, ideaId, sessionId, fullResponseText);
        } catch (error) {
            console.error("[Iteration] Error processing feedback:", error);
            socket.emitToRoom(ideaId, "message:error", {
                sessionId,
                error: error instanceof Error ? error.message : "AI processing failed"
            });
            socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "error" });
        }
    }

    /**
     * Extract display-safe text by stripping JSON code blocks.
     * During streaming, user should see conversational text only.
     */
    private static extractDisplayText(text: string): string {
        // Remove ```json ... ``` blocks
        return text.replace(/```json[\s\S]*?(```|$)/g, "").trim();
    }

    /**
     * Handle discussion response — save as plain text message, no suggestion.
     */
    private static async handleDiscussionResponse(
        repo: IterationRepository,
        socket: SocketService,
        ideaId: string,
        sessionId: string,
        fullResponseText: string
    ) {
        const aiMessage = await repo.addMessage({
            sessionId,
            role: "assistant",
            content: fullResponseText.trim()
        });
        socket.emitToRoom(ideaId, "message:new", aiMessage);
        socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "idle" });
    }

    static async createSuggestion(messageId: string, title: string, summary: string, actions: any[], _: NextFunction): Promise<IIterationSuggestion | void> {
        const repo = IterationRepository.getInstance();
        const suggestion = await repo.createSuggestion({
            messageId,
            title,
            summary,
            actions
        });

        // Find ideaId for the room
        const session = await repo.getSessionByMessageId(messageId);
        if (session) {
            SocketService.getInstance().emitToRoom(session.ideaId, "suggestion:new", suggestion);
        }

        return suggestion;
    }

    static async rejectSuggestion(suggestionId: string, next: NextFunction): Promise<IIterationSuggestion | void> {
        const repo = IterationRepository.getInstance();
        const suggestion = await repo.getSuggestionById(suggestionId);
        if (!suggestion) {
            return next(new AppError(404, "Suggestion not found"));
        }

        if (suggestion.status !== "pending") {
            return next(new AppError(400, `Suggestion is already ${suggestion.status}`));
        }

        const rejected = await repo.updateSuggestionStatus(suggestionId, "rejected");

        // Notify room about rejection
        const message = await repo.getMessageById(suggestion.messageId);
        if (message) {
            const session = await repo.getSessionBySessionId(message.sessionId);
            if (session) {
                SocketService.getInstance().emitToRoom(session.ideaId, "suggestion:status", { id: suggestionId, status: "rejected" });
            }
        }

        return rejected;
    }

    static async approveSuggestion(suggestionId: string, next: NextFunction): Promise<IIterationSuggestion | void> {
        const repo = IterationRepository.getInstance();
        const suggestion = await repo.getSuggestionById(suggestionId);
        if (!suggestion) {
            return next(new AppError(404, "Suggestion not found"));
        }

        if (suggestion.status !== "pending") {
            return next(new AppError(400, `Suggestion is already ${suggestion.status}`));
        }

        // Get ideaId from session
        const message = await repo.getMessageById(suggestion.messageId);
        let ideaId = "";
        let sessionId = "";
        if (message) {
            sessionId = message.sessionId;
            const session = await repo.getSessionBySessionId(message.sessionId);
            if (session) {
                ideaId = session.ideaId;
            }
        }

        if (!ideaId) {
            return next(new AppError(400, "Could not resolve project ID for suggestion"));
        }

        SocketService.getInstance().emitToRoom(ideaId, "ai:state", { sessionId, phase: "editing" });

        // Delegate to ArtifactUpdateEngine — validates targets, routes REGENERATE properly
        const actions: ActionInput[] = (suggestion.actions || []).map(a => ({
            module: a.module,
            targetId: a.targetId,
            actionType: a.actionType,
            newContent: a.newContent,
        }));

        const applyResult = await ArtifactUpdateEngine.executeAll(actions, ideaId);

        // Status: applied | partial | failed
        const finalSuggestion = await repo.updateSuggestionStatus(suggestionId, applyResult.status);
        SocketService.getInstance().emitToRoom(ideaId, "suggestion:status", {
            id: suggestionId,
            status: applyResult.status,
        });

        // Notify client panels to refresh (only if something succeeded)
        if (applyResult.modulesAffected.length > 0) {
            SocketService.getInstance().emitToRoom(ideaId, "artifact:updated", {
                ideaId,
                suggestionId,
                modulesAffected: applyResult.modulesAffected,
            });
        }

        // Post-apply summary message in chat
        const sessionObj = await repo.getSessionByIdeaId(ideaId);
        if (sessionObj) {
            const summaryParts: string[] = [];

            if (applyResult.status === "applied") {
                summaryParts.push(`✅ **Changes applied:** "${suggestion.title}"`);
            } else if (applyResult.status === "partial") {
                summaryParts.push(`⚠️ **Partially applied:** "${suggestion.title}"`);
            } else {
                summaryParts.push(`❌ **Failed to apply:** "${suggestion.title}"`);
            }

            if (applyResult.modulesAffected.length > 0) {
                summaryParts.push(`Updated: ${applyResult.modulesAffected.join(", ")}`);
            }
            if (applyResult.failedActions.length > 0) {
                summaryParts.push(`Failed: ${applyResult.failedActions.join("; ")}`);
            }

            const summaryMsg = await repo.addMessage({
                sessionId: sessionObj.id,
                role: "assistant",
                content: summaryParts.join("\n"),
            });
            SocketService.getInstance().emitToRoom(ideaId, "message:new", summaryMsg);
        }

        SocketService.getInstance().emitToRoom(ideaId, "ai:state", { sessionId, phase: "idle" });

        return finalSuggestion;
    }

    // NOTE: applyAction has been extracted to ArtifactUpdateEngine.
    // See: artifact-update-engine.ts
}
