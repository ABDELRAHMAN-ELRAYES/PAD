import { Injectable, Logger } from "@nestjs/common";
import { IterationRepository } from "./iteration.repository";
import { IdeaRepository } from "../idea/idea.repository";
import { DiagramRepository } from "../diagram/diagram.repository";
import { IRService } from "../ir/ir.service";
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

@Injectable()
export class IterationService {
    private readonly logger = new Logger(IterationService.name);
    private static instance: IterationService;

    constructor(
        private readonly iterationRepo: IterationRepository,
        private readonly ideaRepo: IdeaRepository,
        private readonly diagramRepo: DiagramRepository,
        private readonly irService: IRService,
    ) {
        IterationService.instance = this;
    }

    static getInstance(): IterationService {
        return IterationService.instance;
    }

    static async getOrCreateSession(ideaId: string, _next?: any): Promise<IIterationSession> {
        return IterationService.getInstance().getOrCreateSession(ideaId);
    }

    static async addMessage(ideaId: string, role: "user" | "assistant", content: string, _next?: any): Promise<IIterationMessage> {
        return IterationService.getInstance().addMessage(ideaId, role, content);
    }

    async getOrCreateSession(ideaId: string): Promise<IIterationSession> {
        let session = await this.iterationRepo.getSessionByIdeaId(ideaId);

        if (!session) {
            session = await this.iterationRepo.createSession({ ideaId });
            // Emit to room only (not all clients) to avoid cross-tenant leaks
            SocketService.getInstance().emitToRoom(ideaId, "session:created", session);
        }

        return session;
    }

    async addMessage(ideaId: string, role: "user" | "assistant", content: string): Promise<IIterationMessage> {
        const session = await this.getOrCreateSession(ideaId);

        const message = await this.iterationRepo.addMessage({
            sessionId: session.id,
            role,
            content,
        });

        SocketService.getInstance().emitToRoom(ideaId, "message:new", message);

        if (role === "user") {
            // Trigger AI processing in background (not awaited — REST responds immediately)
            this.processFeedbackInBackground(ideaId, session.id, content).catch((err) => {
                this.logger.error(`[Iteration] Unhandled background feedback error: ${err.message}`, err.stack);
            });
        }

        return message;
    }

    private async processFeedbackInBackground(ideaId: string, sessionId: string, feedback: string): Promise<void> {
        const socket = SocketService.getInstance();
        socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "thinking" });
        try {
            // 1. Classify intent
            const intent: IterationIntent = await classifyIntent(feedback);
            this.logger.log(`[Iteration] Intent: ${intent} | message: "${feedback.substring(0, 80)}"`);

            // 2. Build context — pass user message for artifact reference resolution
            const context = intent === "discussion"
                ? await IterationContextBuilder.buildSummaryContext(ideaId, feedback)
                : await IterationContextBuilder.buildTargetedContext(ideaId, feedback);
            const contextStr = IterationContextBuilder.serialize(context);
            this.logger.log(`[Iteration] Context built: ${contextStr.length} chars`);

            // 3. Get conversation history
            const history = (await this.iterationRepo.getMessagesBySessionId(sessionId)).map(m => ({
                role: m.role,
                content: m.content,
            }));

            if (intent === "ir_modification") {
                socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "editing" });

                // Retrieve userId from the idea
                const ideaObj = await this.ideaRepo.findById(ideaId);
                const userId = ideaObj?.userId;

                if (!userId) {
                    throw new Error("User ID not found for the project");
                }

                // Apply patch to the IR schema
                const updatedIr = await this.irService.patchIR(ideaId, feedback, userId);

                if (!updatedIr) {
                    throw new Error("Failed to apply schema changes");
                }

                // Autocompile downstream documents & diagrams
                const existingDiagrams = await this.diagramRepo.getDiagramsByIdeaId(ideaId);
                const diagramTypesToCompile = existingDiagrams.length > 0
                    ? existingDiagrams.map((d: any) => d.type)
                    : ["ERD", "SEQUENCE"];

                await this.irService.compileIR(ideaId, diagramTypesToCompile, userId);

                // Post a message in the chat explaining the changes applied
                const explanation = `✅ **Facts Schema updated successfully!**\n\nI have merged your requested database/schema changes into the project's Intermediate Representation (IR) and recompiled all downstream assets (PRD, BRD, and diagrams).\n\n**Applied change:** "${feedback}"`;

                const aiMessage = await this.iterationRepo.addMessage({
                    sessionId,
                    role: "assistant",
                    content: explanation,
                });

                socket.emitToRoom(ideaId, "message:new", aiMessage);

                // Notify all client panels to refresh
                socket.emitToRoom(ideaId, "artifact:updated", {
                    ideaId,
                    modulesAffected: ["IR", "DOCUMENT", "DIAGRAM"],
                });

                socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "idle" });
                return;
            }

            // 4. Build prompt based on intent (discussion only)
            const prompt = buildDiscussionPrompt(contextStr, history, feedback);

            // Retrieve userId from the idea
            const ideaObj = await this.ideaRepo.findById(ideaId);
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
                    type: "chunk",
                });
            }
            this.logger.log(`[Iteration] Stream done: ${chunkCount} chunks, ${fullResponseText.length} chars total`);

            socket.emitToRoom(ideaId, "message:stream", {
                sessionId,
                fullText: this.extractDisplayText(fullResponseText),
                type: "done",
            });

            // 6. Process completed response
            await this.handleDiscussionResponse(this.iterationRepo, socket, ideaId, sessionId, fullResponseText);
        } catch (error) {
            this.logger.error("[Iteration] Error processing feedback:", error);
            socket.emitToRoom(ideaId, "message:error", {
                sessionId,
                error: error instanceof Error ? error.message : "AI processing failed",
            });
            socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "error" });
        }
    }

    /**
     * Extract display-safe text by stripping JSON code blocks.
     * During streaming, user should see conversational text only.
     */
    private extractDisplayText(text: string): string {
        // Remove ```json ... ``` blocks
        return text.replace(/```json[\s\S]*?(```|$)/g, "").trim();
    }

    /**
     * Handle discussion response — save as plain text message, no suggestion.
     */
    private async handleDiscussionResponse(
        repo: IterationRepository,
        socket: SocketService,
        ideaId: string,
        sessionId: string,
        fullResponseText: string,
    ) {
        const aiMessage = await repo.addMessage({
            sessionId,
            role: "assistant",
            content: fullResponseText.trim(),
        });
        socket.emitToRoom(ideaId, "message:new", aiMessage);
        socket.emitToRoom(ideaId, "ai:state", { sessionId, phase: "idle" });
    }
}

export default IterationService;
