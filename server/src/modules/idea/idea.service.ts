import { NextFunction } from "express";
import AppError from "../../utils/app-error";
import IdeaRepository from "./idea.repository";
import AiService from "../ai/ai.service";
import {
    ICreateIdeaData,
    IUpdateIdeaData,
    IIdea,
    IIdeaResponse,
} from "./types/IIdea";
import SocketService from "../../services/socket.service";
import DiscoveryService from "../discovery/discovery.service";

class IdeaService {
    private static ideaRepository: IdeaRepository = IdeaRepository.getInstance();

    // Minimum and maximum character limits for idea text
    private static MIN_CHAR_LIMIT = 20;
    private static MAX_CHAR_LIMIT = 10000;

    // Create a new idea
    static async createIdea(
        data: ICreateIdeaData,
        next: NextFunction
    ): Promise<IIdea | void> {
        // Validate idea text
        const validationError = this.validateIdeaText(data.rawText);
        if (validationError) {
            return next(new AppError(400, validationError));
        }

        // Normalize whitespace
        const normalizedText = this.normalizeText(data.rawText);

        // Create the idea
        const idea = await this.ideaRepository.createIdea({
            rawText: normalizedText,
            userId: data.userId,
        });

        return idea as IIdea;
    }

    // Stream business description generation and trigger discovery questionnaire once finished
    static async streamBusinessDescription(
        ideaId: string,
        next: NextFunction,
        onChunk: (data: any) => void
    ): Promise<void> {
        const idea = await this.ideaRepository.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        let fullResponse = "";

        try {
            const stream = AiService.generateBusinessDescriptionStream(idea.rawText, idea.userId);

            for await (const chunk of stream) {
                fullResponse += chunk;
                onChunk({
                    chunk,
                    fullText: fullResponse,
                });
            }

            // After streaming is complete, save it to DB
            const updatedIdea = await this.ideaRepository.updateIdea(ideaId, {
                businessDescription: fullResponse,
            });

            // Trigger discovery questionnaire generation in the background using the generated business description
            DiscoveryService.generateQuestionnaire(ideaId).catch((err) => {
                console.error("Failed to generate background questionnaire from streamed business description:", err);
            });

            // Send final status message
            onChunk({ status: "final", idea: updatedIdea });
        } catch (error) {
            console.error("AI business description generation error:", error);
            const errorMessage = error instanceof Error ? error.message : "Generation failed";
            onChunk({ status: "error", message: errorMessage });
        }
    }

    // Get idea by ID
    static async getIdea(
        ideaId: string,
        next: NextFunction
    ): Promise<IIdea | void> {
        const idea = await this.ideaRepository.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        return idea as IIdea;
    }

    // List all ideas
    static async listIdeas(userId?: string): Promise<IIdeaResponse[]> {
        const ideas = await this.ideaRepository.getAllIdeas(userId);
        return ideas as IIdeaResponse[];
    }

    // Analyze idea with AI
    static async analyzeIdea(
        ideaId: string,
        next: NextFunction,
        onChunk?: (data: any) => void
    ): Promise<IIdea | void> {
        const idea = await this.ideaRepository.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        if (onChunk) {
            // Perform analysis and stream directly to callback (HTTP response)
            await this.processIdeaAnalysis(ideaId, idea.refinedText || idea.rawText, onChunk);
        } else {
            // Legacy/Background processing for sockets
            this.processIdeaAnalysis(ideaId, idea.refinedText || idea.rawText);
        }

        return idea as IIdea;
    }

    // Process analysis with streaming (callback and/or sockets)
    private static async processIdeaAnalysis(ideaId: string, text: string, onChunk?: (data: any) => void) {
        const socketService = SocketService.getInstance();
        let fullResponse = "";

        try {
            const idea = await this.ideaRepository.getIdeaById(ideaId);
            const userId = idea?.userId;
            const stream = AiService.analyzeIdeaStream(text, userId);

            for await (const chunk of stream) {
                fullResponse += chunk;
                const chunkData = {
                    chunk,
                    fullText: fullResponse,
                };
                // Stream to HTTP response if callback provided
                if (onChunk) {
                    onChunk(chunkData);
                }
            }

            // After streaming is complete, parse and save
            const result = (AiService as any).parseAnalysisResult(fullResponse);

            if (result) {
                const updatedIdea = await this.ideaRepository.updateIdea(ideaId, {
                    analysisResult: result,
                });
                
                if (onChunk) {
                    onChunk({ status: "final", idea: updatedIdea });
                }
            }
        } catch (error) {
            console.error("AI analysis error:", error);
            const errorMessage = error instanceof Error ? error.message : "Analysis failed";
            
            socketService.emitToRoom(ideaId, "overview:error", { message: errorMessage });
            if (onChunk) {
                onChunk({ status: "error", message: errorMessage });
            }
        }
    }

    // Refine an idea with new text and/or answers to clarifying questions
    static async refineIdea(
        ideaId: string,
        data: IUpdateIdeaData,
        next: NextFunction
    ): Promise<IIdea | void> {
        const idea = await this.ideaRepository.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        // Check if idea is already confirmed
        if (idea.status === "confirmed") {
            return next(new AppError(400, "Cannot refine a confirmed idea"));
        }

        // Validate refined text if provided
        if (data.refinedText) {
            const validationError = this.validateIdeaText(data.refinedText);
            if (validationError) {
                return next(new AppError(400, validationError));
            }
        }

        // If answers are provided, append them to refined text and re-analyze
        if (data.answers && data.answers.length > 0) {
            // Build context from answers
            const answersContext = data.answers
                .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
                .join("\n\n");

            // Use existing refined text or raw text as base
            const baseText = data.refinedText || idea.refinedText || idea.rawText;
            const refinedWithAnswers = `${baseText}\n\n--- Additional Context ---\n${answersContext}`;

            // Re-analyze with the answers for better insights
            const analysisResult = await AiService.reAnalyzeWithAnswers(
                idea.refinedText || idea.rawText,
                data.answers,
                next,
                idea.userId
            );

            if (!analysisResult) {
                return; // Error already handled by AI service
            }

            // Update the idea with new refined text and analysis
            const updatedIdea = await this.ideaRepository.updateIdea(ideaId, {
                refinedText: this.normalizeText(refinedWithAnswers),
                analysisResult,
            });

            return updatedIdea as IIdea;
        }

        // Standard refinement without answers
        const updatedIdea = await this.ideaRepository.updateIdea(ideaId, {
            refinedText: data.refinedText
                ? this.normalizeText(data.refinedText)
                : undefined,
        });

        return updatedIdea as IIdea;
    }

    // Confirm an idea
    static async confirmIdea(
        ideaId: string,
        next: NextFunction
    ): Promise<IIdea | void> {
        const idea = await this.ideaRepository.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        // Check if idea is already confirmed
        if (idea.status === "confirmed") {
            return next(new AppError(400, "Idea is already confirmed"));
        }

        // Require Deep Research to be complete before confirmation
        if (idea.status !== "research_complete" && !idea.researchResult) {
            return next(
                new AppError(400, "Deep research must be completed before confirmation")
            );
        }

        // Confirm the idea
        const confirmedIdea = await this.ideaRepository.confirmIdea(ideaId);

        return confirmedIdea as IIdea;
    }

    // Helper: Validate idea text
    private static validateIdeaText(text: string): string | null {
        if (!text || text.trim().length === 0) {
            return "Idea text is required";
        }

        if (text.trim().length < this.MIN_CHAR_LIMIT) {
            return `Idea must be at least ${this.MIN_CHAR_LIMIT} characters`;
        }

        if (text.length > this.MAX_CHAR_LIMIT) {
            return `Idea must not exceed ${this.MAX_CHAR_LIMIT} characters`;
        }

        return null;
    }

    // Helper: Normalize whitespace
    private static normalizeText(text: string): string {
        return text.trim().replace(/\s+/g, " ");
    }
}

export default IdeaService;
