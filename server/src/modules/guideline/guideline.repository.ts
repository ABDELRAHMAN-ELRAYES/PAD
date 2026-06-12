import PrismaClientSingleton from "../../data-server-clients/prisma-client";
import { PrismaClient } from "@prisma/client";
import AppError from "../../utils/app-error";

export class GuidelineRepository {
    private prisma: PrismaClient;
    private static instance: GuidelineRepository;

    private constructor() {
        this.prisma = PrismaClientSingleton.getPrismaClient();
    }

    static getInstance(): GuidelineRepository {
        if (!GuidelineRepository.instance) {
            GuidelineRepository.instance = new GuidelineRepository();
        }
        return GuidelineRepository.instance;
    }

    async createGuideline(data: {
        userId: string;
        fileId?: string;
        title: string;
        content: string;
    }) {
        try {
            return await this.prisma.guideline.create({
                data: {
                    userId: data.userId,
                    fileId: data.fileId || null,
                    title: data.title,
                    content: data.content,
                },
                include: {
                    file: true,
                },
            });
        } catch (error) {
            console.error("Create guideline error:", error);
            throw new AppError(500, "Failed to create guideline in DB");
        }
    }

    async getGuidelineById(guidelineId: string) {
        try {
            return await this.prisma.guideline.findUnique({
                where: { id: guidelineId },
                include: {
                    file: true,
                },
            });
        } catch (error) {
            console.error("Get guideline error:", error);
            throw new AppError(500, "Failed to fetch guideline");
        }
    }

    async listGuidelinesByUserId(userId: string) {
        try {
            return await this.prisma.guideline.findMany({
                where: { userId },
                include: {
                    file: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        } catch (error) {
            console.error("List guidelines error:", error);
            throw new AppError(500, "Failed to fetch guidelines list");
        }
    }

    async deleteGuideline(guidelineId: string) {
        try {
            return await this.prisma.guideline.delete({
                where: { id: guidelineId },
            });
        } catch (error) {
            console.error("Delete guideline error:", error);
            throw new AppError(500, "Failed to delete guideline");
        }
    }
}

export default GuidelineRepository;
