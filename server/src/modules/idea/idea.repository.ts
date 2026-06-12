import PrismaClientSingleton from "../../data-server-clients/prisma-client";
import { Prisma, PrismaClient } from "@prisma/client";
import AppError from "../../utils/app-error";
import {
    ICreateIdeaRepositoryData,
    IUpdateIdeaRepositoryData,
} from "./types/IIdea";

class IdeaRepository {
    private prisma: PrismaClient;
    static ideaRepositoryInstance: IdeaRepository;

    private constructor() {
        this.prisma = PrismaClientSingleton.getPrismaClient();
    }

    static getInstance(): IdeaRepository {
        if (!IdeaRepository.ideaRepositoryInstance) {
            IdeaRepository.ideaRepositoryInstance = new IdeaRepository();
        }
        return IdeaRepository.ideaRepositoryInstance;
    }

    // Create a new idea
    async createIdea(data: ICreateIdeaRepositoryData) {
        try {
            return await this.prisma.idea.create({
                data: {
                    rawText: data.rawText,
                    userId: data.userId,
                } as Prisma.IdeaUncheckedCreateInput,
            });
        } catch (error) {
            console.error("Create idea error:", error);
            throw new AppError(500, "Failed to create idea");
        }
    }

    // Get idea by ID
    async getIdeaById(ideaId: string) {
        try {
            return await this.prisma.idea.findUnique({
                where: { id: ideaId },
            });
        } catch (error) {
            throw new AppError(500, "Failed to fetch idea");
        }
    }

    // Get all ideas
    async getAllIdeas(userId?: string) {
        try {
            return await this.prisma.idea.findMany({
                where: userId ? { userId } : {},
                orderBy: { createdAt: "desc" },
            });
        } catch (error) {
            throw new AppError(500, "Failed to fetch ideas");
        }
    }

    // Update idea
    async updateIdea(ideaId: string, data: IUpdateIdeaRepositoryData) {
        try {
            return await this.prisma.idea.update({
                where: { id: ideaId },
                data: {
                    refinedText: data.refinedText,
                    analysisResult: data.analysisResult as object | undefined,
                    status: data.status,
                },
            });
        } catch (error) {
            throw new AppError(500, "Failed to update idea");
        }
    }

    // Confirm an idea
    async confirmIdea(ideaId: string) {
        try {
            return await this.prisma.idea.update({
                where: { id: ideaId },
                data: {
                    status: "confirmed",
                },
            });
        } catch (error) {
            throw new AppError(500, "Failed to confirm idea");
        }
    }
}

export default IdeaRepository;
