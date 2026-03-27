import { NextFunction } from "express";
import AppError from "../../utils/app-error";
import DiagramRepository from "./diagram.repository";
import IdeaRepository from "../idea/idea.repository";
import AiService from "../ai/ai.service";
import {
    IDiagram,
    IUpdateDiagramData,
    DiagramType,
} from "./types/IDiagram";
import SocketService from "../../services/socket.service";

class DiagramService {
    private static diagramRepository: DiagramRepository = DiagramRepository.getInstance();
    private static ideaRepository: IdeaRepository = IdeaRepository.getInstance();

    // Generate all diagrams for an idea
    static async generateDiagrams(
        ideaId: string,
        next: NextFunction,
        onChunk?: (data: any) => void
    ): Promise<IDiagram[] | void> {
        // Get the idea
        const idea = await this.ideaRepository.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        // Require confirmed status
        if (idea.status !== "confirmed") {
            return next(new AppError(400, "Cannot generate diagrams for unconfirmed idea"));
        }

        const ideaText = idea.refinedText || idea.rawText;

        if (onChunk) {
            // Perform generation and stream directly to callback (HTTP response)
            await this.processDiagramGeneration(ideaId, ideaText, onChunk);
        } else {
            // Background generation (still used by some parts, but without sockets for now)
            this.processDiagramGeneration(ideaId, ideaText);
        }

        return [];
    }

    private static async processDiagramGeneration(ideaId: string, ideaText: string, onChunk?: (data: any) => void) {
        const diagramTypes: DiagramType[] = ["ERD", "SEQUENCE", "SCHEMA"];
        const createdDiagrams: IDiagram[] = [];

        try {
            for (const type of diagramTypes) {
                let fullResponse = "";
                const stream = AiService.generateDiagramStream(type, ideaText);

                for await (const chunk of stream) {
                    fullResponse += chunk;
                    const chunkData = {
                        type,
                        chunk,
                        fullText: fullResponse,
                    };
                    if (onChunk) {
                        onChunk(chunkData);
                    }
                }

                const result = AiService.parseDiagramResult(fullResponse);
                if (result) {
                    const diagram = await this.diagramRepository.createDiagram({
                        ideaId,
                        type,
                        title: result.title,
                        mermaidCode: result.mermaidCode,
                    });
                    createdDiagrams.push(diagram as IDiagram);
                    if (onChunk) {
                        onChunk({ status: "final_one", diagram });
                    }
                }
            }

            if (onChunk) {
                onChunk({ status: "final_all", diagrams: createdDiagrams });
            }
        } catch (error) {
            console.error("AI diagram generation error:", error);
            const errorMessage = error instanceof Error ? error.message : "Diagram generation failed";
            
            if (onChunk) {
                onChunk({ status: "error", message: errorMessage });
            }
        }
    }

    // Get diagram by ID
    static async getDiagram(
        diagramId: string,
        next: NextFunction
    ): Promise<IDiagram | void> {
        const diagram = await this.diagramRepository.getDiagramById(diagramId);
        if (!diagram) {
            return next(new AppError(404, "Diagram not found"));
        }
        return diagram as IDiagram;
    }

    // Get all diagrams for an idea
    static async getDiagramsByIdea(ideaId: string): Promise<IDiagram[]> {
        const diagrams = await this.diagramRepository.getDiagramsByIdeaId(ideaId);
        return diagrams as IDiagram[];
    }

    // Update a diagram (with version history)
    static async updateDiagram(
        diagramId: string,
        data: IUpdateDiagramData,
        next: NextFunction
    ): Promise<IDiagram | void> {
        const existing = await this.diagramRepository.getDiagramById(diagramId);
        if (!existing) {
            return next(new AppError(404, "Diagram not found"));
        }

        // If mermaid code is changing, create a version snapshot first
        if (data.mermaidCode && data.mermaidCode !== existing.mermaidCode) {
            await this.diagramRepository.createVersion(
                diagramId,
                existing.mermaidCode,
                data.changelog || "Previous version"
            );
        }

        // Update the diagram
        const updated = await this.diagramRepository.updateDiagram(diagramId, {
            title: data.title,
            mermaidCode: data.mermaidCode,
            status: data.status,
        });

        return updated as IDiagram;
    }

    // Get diagram with version history
    static async getDiagramWithVersions(
        diagramId: string,
        next: NextFunction
    ) {
        const diagram = await this.diagramRepository.getDiagramWithVersions(diagramId);
        if (!diagram) {
            return next(new AppError(404, "Diagram not found"));
        }
        return diagram;
    }

    // Get versions for a diagram
    static async getDiagramVersions(diagramId: string) {
        return await this.diagramRepository.getVersionsByDiagramId(diagramId);
    }

    // Regenerate a specific diagram
    static async regenerateDiagram(
        diagramId: string,
        next: NextFunction
    ): Promise<IDiagram | void> {
        const existing = await this.diagramRepository.getDiagramWithVersions(diagramId);
        if (!existing) {
            return next(new AppError(404, "Diagram not found"));
        }

        // Get the idea for context
        const idea = await this.ideaRepository.getIdeaById(existing.ideaId);
        if (!idea) {
            return next(new AppError(404, "Associated idea not found"));
        }

        // Save current version
        await this.diagramRepository.createVersion(
            diagramId,
            existing.mermaidCode,
            "Before regeneration"
        );

        const ideaText = idea.refinedText || idea.rawText;

        // Start background regeneration
        this.processDiagramRegenerationInBackground(diagramId, ideaText, existing.type as DiagramType);

        return existing as IDiagram;
    }

    private static async processDiagramRegenerationInBackground(
        diagramId: string,
        ideaText: string,
        type: DiagramType
    ) {
        const socketService = SocketService.getInstance();
        const existing = await this.diagramRepository.getDiagramById(diagramId);
        if (!existing) return;
        const ideaId = existing.ideaId;

        try {
            let fullResponse = "";
            const stream = AiService.generateDiagramStream(type, ideaText);

            for await (const chunk of stream) {
                fullResponse += chunk;
                socketService.emitToRoom(ideaId, "diagram:stream", {
                    diagramId,
                    type,
                    chunk,
                    fullText: fullResponse,
                });
            }

            const result = AiService.parseDiagramResult(fullResponse);
            if (result) {
                const updated = await this.diagramRepository.updateDiagram(diagramId, {
                    title: result.title,
                    mermaidCode: result.mermaidCode,
                });
                socketService.emitToRoom(ideaId, "diagram:updated", updated);
            }
        } catch (error) {
            console.error("Background diagram regeneration error:", error);
            socketService.emitToRoom(ideaId, "diagram:error", {
                diagramId,
                message: "Failed to regenerate diagram",
            });
        }
    }
}

export default DiagramService;
