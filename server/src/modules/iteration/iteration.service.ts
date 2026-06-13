import { NextFunction } from "express";
import IterationRepository from "./iteration.repository";
import {
    IIterationSession,
    IIterationMessage,
} from "./types/IIteration";
import SocketService from "../../services/socket.service";
import AiService from "../ai/ai.service";

// Phase 2: Intent classification, context building, dual prompts
import { classifyIntent, IterationIntent } from "./iteration-intent.classifier";
import IterationContextBuilder from "./iteration-context.builder";
import { buildDiscussionPrompt } from "../ai/prompts/iteration-discussion.prompt";

import IRService from "../ir/ir.service";

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

            if (intent === "ir_modification") {
                socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "editing" });

                // Retrieve userId from the idea
                const ideaRepo = require("../idea/idea.repository").IdeaRepository.getInstance();
                const ideaObj = await ideaRepo.getIdeaById(ideaId);
                const userId = ideaObj?.userId;

                if (!userId) {
                    throw new Error("User ID not found for the project");
                }

                // Apply patch to the IR schema
                const updatedIr = await IRService.patchIR(ideaId, feedback, userId, (err) => {
                    if (err) throw err;
                });

                if (!updatedIr) {
                    throw new Error("Failed to apply schema changes");
                }

                // Autocompile downstream documents & diagrams
                const diagramRepo = require("../diagram/diagram.repository").DiagramRepository.getInstance();
                const existingDiagrams = await diagramRepo.getDiagramsByIdeaId(ideaId);
                const diagramTypesToCompile = existingDiagrams.length > 0 
                    ? existingDiagrams.map((d: any) => d.type)
                    : ["ERD", "SEQUENCE"];

                await IRService.compileIR(ideaId, diagramTypesToCompile, userId, (err) => {
                    if (err) throw err;
                });

                // Post a message in the chat explaining the changes applied
                const explanation = `✅ **Facts Schema updated successfully!**\n\nI have merged your requested database/schema changes into the project's Intermediate Representation (IR) and recompiled all downstream assets (PRD, BRD, and diagrams).\n\n**Applied change:** "${feedback}"`;

                const aiMessage = await repo.addMessage({
                    sessionId,
                    role: "assistant",
                    content: explanation
                });

                socket.emitToRoom(ideaId, "message:new", aiMessage);

                // Notify all client panels to refresh
                socket.emitToRoom(ideaId, "artifact:updated", {
                    ideaId,
                    modulesAffected: ["IR", "DOCUMENT", "DIAGRAM"]
                });

                socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "idle" });
                return;
            }


            // 4. Build prompt based on intent (discussion only)
            const prompt = buildDiscussionPrompt(contextStr, history, feedback);

            // Retrieve userId from the idea
            const ideaRepo = require("../idea/idea.repository").IdeaRepository.getInstance();
            const ideaObj = await ideaRepo.getIdeaById(ideaId);
            const userId = ideaObj?.userId;

            // 5. Stream LLM response
            let fullResponseText = "";
            let chunkCount = 0;
            let isGenerating = false;
            
            for await (const chunk of AiService.callLLMStream(prompt, undefined, userId)) {
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
}
