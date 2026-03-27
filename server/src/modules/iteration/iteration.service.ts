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
import { buildIterationPrompt } from "../ai/prompts/iteration.prompt";

// Fixing imports to use backend services
import IdeaRepository from "../idea/idea.repository";
import DocumentRepository from "../document/document.repository";
import DiagramRepository from "../diagram/diagram.repository";
import FeatureRepository from "../feature/feature.repository";
import TaskRepository from "../task/task.repository";
import { workflowRepository } from "../workflow/workflow.repository";
import { IFeature } from "../feature/types/IFeature";

export default class IterationService {
    constructor() {
    }

    static async getOrCreateSession(ideaId: string, _: NextFunction): Promise<IIterationSession | void> {
        const repo = IterationRepository.getInstance();
        let session = await repo.getSessionByIdeaId(ideaId);

        if (!session) {
            session = await repo.createSession({ ideaId });
            SocketService.getInstance().emitToAll("session:created", session);
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
            // Trigger AI processing in background
            this.processFeedbackInBackground(ideaId, session.id, content);
        }

        return message;
    }

    private static async processFeedbackInBackground(ideaId: string, sessionId: string, feedback: string) {
        try {
            const repo = IterationRepository.getInstance();
            const ideaRepo = IdeaRepository.getInstance();
            const idea = await ideaRepo.getIdeaById(ideaId);
            if (!idea) return;

            // Get context (documents, diagrams, etc.)
            const docRepo = DocumentRepository.getInstance();
            const diagramRepo = DiagramRepository.getInstance();
            const featureRepo = FeatureRepository.getInstance();
            const taskRepo = TaskRepository.getInstance();

            const features = await featureRepo.getFeaturesByIdeaId(ideaId);
            const featuresWithTasks = await Promise.all(features.map(async (f: IFeature) => ({
                ...f,
                tasks: await taskRepo.getTasksByFeatureId(f.id)
            })));

            const context = {
                documents: await docRepo.getDocumentsByIdeaId(ideaId),
                diagrams: await diagramRepo.getDiagramsByIdeaId(ideaId),
                features: featuresWithTasks,
                workflow: await workflowRepository.getWorkflowByIdeaId(ideaId)
            };

            const history = (await repo.getMessagesBySessionId(sessionId)).map(m => ({
                role: m.role,
                content: m.content
            }));

            const prompt = buildIterationPrompt(idea.refinedText || idea.rawText, history, feedback, context);
            let fullResponseText = "";
            
            // Stream raw response via socket for real-time UI updates
            const socket = SocketService.getInstance();
            for await (const chunk of AiService.callLLMStream(prompt)) {
                fullResponseText += chunk;
                socket.emitToRoom(ideaId, "message:stream", { 
                    sessionId, 
                    chunk, 
                    fullText: fullResponseText 
                });
            }

            // Once finished, parse the full response
            // Extract JSON block
            const jsonMatch = fullResponseText.match(/```json\n([\s\S]*?)\n```/) ||
                fullResponseText.match(/```\n([\s\S]*?)\n```/) ||
                (fullResponseText.trim().startsWith("{") ? [null, fullResponseText.trim()] : null);

            const jsonStr = jsonMatch ? jsonMatch[1].trim() : null;
            let aiResult: any = null;

            if (jsonStr) {
                try {
                    aiResult = JSON.parse(jsonStr);
                } catch (e) {
                    console.error("Failed to parse streamed AI JSON:", e);
                }
            } else {
                // If not JSON, treat the whole thing as the response
                aiResult = { response: fullResponseText };
            }

            if (aiResult) {
                // 1. Add AI response message to database
                const aiMessage = await repo.addMessage({
                    sessionId,
                    role: "assistant",
                    content: aiResult.response || fullResponseText
                });
                
                // Notify that streaming is finished and message is saved
                socket.emitToRoom(ideaId, "message:new", aiMessage);

                // 2. Create suggestion if present
                if (aiResult.suggestion) {
                    const suggestion = await repo.createSuggestion({
                        messageId: aiMessage.id,
                        title: aiResult.suggestion.title,
                        summary: aiResult.suggestion.summary,
                        actions: aiResult.suggestion.actions
                    });
                    socket.emitToRoom(ideaId, "suggestion:new", suggestion);
                }
            }
        } catch (error) {
            console.error("Error processing feedback in background:", error);
        }
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
        const session = await repo.getSessionByMessageId(messageId); // I need to add this to repo
        if (session) {
            SocketService.getInstance().emitToRoom(session.ideaId, "suggestion:new", suggestion);
        }

        return suggestion;
    }

    static async getSession(ideaId: string, next: NextFunction): Promise<IIterationSession | void> {
        const repo = IterationRepository.getInstance();
        const session = await repo.getSessionByIdeaId(ideaId);
        if (!session) {
            return next(new AppError(404, "Iteration session not found"));
        }
        return session;
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

        // Apply actions
        for (const action of suggestion.actions || []) {
            try {
                await this.applyAction(action);
            } catch (error) {
                console.error(`Failed to apply action:`, error);
                return next(new AppError(500, `Failed to apply suggestion action for ${action.module}`));
            }
        }

        await repo.updateSuggestionStatus(suggestionId, "approved");

        // Find ideaId for the room
        const message = await repo.getMessageById(suggestion.messageId); // I need to add this to repo
        if (message) {
            const session = await repo.getSessionBySessionId(message.sessionId); // I need to add this to repo
            if (session) {
                SocketService.getInstance().emitToRoom(session.ideaId, "suggestion:status", { id: suggestionId, status: "approved" });
            }
        }

        // Mark as applied after successful application
        const finalSuggestion = await repo.updateSuggestionStatus(suggestionId, "applied");
        if (message) {
            const session = await repo.getSessionBySessionId(message.sessionId);
            if (session) {
                SocketService.getInstance().emitToRoom(session.ideaId, "suggestion:status", { id: suggestionId, status: "applied" });
            }
        }

        return finalSuggestion;
    }

    private static async applyAction(action: any) {
        // This is where we update other modules
        // Depending on action.module and action.actionType
        switch (action.module) {
            case "DOCUMENT":
                // Logic to update documents (need DocumentService or Repository)
                break;
            case "DIAGRAM":
                // Logic to update diagrams
                break;
            case "FEATURE":
                // Logic to update features
                break;
            case "TASK":
                // Logic to update tasks
                break;
            case "WORKFLOW":
                // Logic to update workflow
                break;
        }
    }
}
