import PrismaClientSingleton from "../../data-server-clients/prisma-client";
import { Prisma, PrismaClient } from "@prisma/client";
import AppError from "../../utils/app-error";
import {
    ICreateDiagramRepositoryData,
    IUpdateDiagramRepositoryData,
} from "./types/IDiagram";

class DiagramRepository {
    private prisma: PrismaClient;
    static diagramRepositoryInstance: DiagramRepository;

    private constructor() {
        this.prisma = PrismaClientSingleton.getPrismaClient();
    }

    static getInstance(): DiagramRepository {
        if (!DiagramRepository.diagramRepositoryInstance) {
            DiagramRepository.diagramRepositoryInstance = new DiagramRepository();
        }
        return DiagramRepository.diagramRepositoryInstance;
    }

    // Create a new diagram
    async createDiagram(data: ICreateDiagramRepositoryData) {
        try {
            return await this.prisma.diagram.create({
                data: {
                    ideaId: data.ideaId,
                    type: data.type,
                    title: data.title,
                    mermaidCode: data.mermaidCode,
                    tier1Code: data.tier1Code || null,
                    tier2Code: data.tier2Code || null,
                    tier3Code: data.tier3Code || null,
                    activeTier: data.activeTier || null,
                    validationError: data.validationError || null,
                } as Prisma.DiagramUncheckedCreateInput,
            });
        } catch (error) {
            console.error("Create diagram error:", error);
            throw new AppError(500, "Failed to create diagram");
        }
    }

    // Get diagram by ID
    async getDiagramById(id: string) {
        try {
            return await this.prisma.diagram.findUnique({
                where: { id },
            });
        } catch (error) {
            console.error("Get diagram error:", error);
            throw new AppError(500, "Failed to get diagram");
        }
    }

    // Get diagram with versions
    async getDiagramWithVersions(id: string) {
        try {
            return await this.prisma.diagram.findUnique({
                where: { id },
                include: {
                    versions: {
                        orderBy: { version: "desc" },
                    },
                },
            });
        } catch (error) {
            console.error("Get diagram with versions error:", error);
            throw new AppError(500, "Failed to get diagram with versions");
        }
    }

    // Get all diagrams for an idea
    async getDiagramsByIdeaId(ideaId: string) {
        try {
            return await this.prisma.diagram.findMany({
                where: { ideaId },
                orderBy: { createdAt: "desc" },
            });
        } catch (error) {
            console.error("Get diagrams by idea error:", error);
            throw new AppError(500, "Failed to get diagrams");
        }
    }

    // Update a diagram
    async updateDiagram(id: string, data: IUpdateDiagramRepositoryData) {
        try {
            return await this.prisma.diagram.update({
                where: { id },
                data,
            });
        } catch (error) {
            console.error("Update diagram error:", error);
            throw new AppError(500, "Failed to update diagram");
        }
    }

    // Create a version snapshot
    async createVersion(diagramId: string, mermaidCode: string, changelog?: string) {
        try {
            // Get the next version number
            const lastVersion = await this.prisma.diagramVersion.findFirst({
                where: { diagramId },
                orderBy: { version: "desc" },
            });
            const nextVersion = (lastVersion?.version || 0) + 1;

            return await this.prisma.diagramVersion.create({
                data: {
                    diagramId,
                    version: nextVersion,
                    mermaidCode,
                    changelog,
                },
            });
        } catch (error) {
            console.error("Create diagram version error:", error);
            throw new AppError(500, "Failed to create diagram version");
        }
    }

    // Get versions for a diagram
    async getVersionsByDiagramId(diagramId: string) {
        try {
            return await this.prisma.diagramVersion.findMany({
                where: { diagramId },
                orderBy: { version: "desc" },
            });
        } catch (error) {
            console.error("Get diagram versions error:", error);
            throw new AppError(500, "Failed to get diagram versions");
        }
    }

    // Delete a diagram
    async deleteDiagram(id: string) {
        try {
            return await this.prisma.diagram.delete({
                where: { id },
            });
        } catch (error) {
            console.error("Delete diagram error:", error);
            throw new AppError(500, "Failed to delete diagram");
        }
    }
}

export default DiagramRepository;
