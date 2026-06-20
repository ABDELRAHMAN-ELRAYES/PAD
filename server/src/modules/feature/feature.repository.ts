import { PrismaClient } from "@prisma/client";
import AppError from "../../utils/app-error";
import {
    ICreateFeatureRepositoryData,
    IUpdateFeatureRepositoryData,
    IFeature,
    IFeatureVersion,
    IFeatureWithTasks,
} from "./types/IFeature";

export default class FeatureRepository {
    private static instance: FeatureRepository;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): FeatureRepository {
        if (!FeatureRepository.instance) {
            FeatureRepository.instance = new FeatureRepository();
        }
        return FeatureRepository.instance;
    }

    // Create a new feature
    async createFeature(data: ICreateFeatureRepositoryData): Promise<IFeature> {
        try {
            return await this.prisma.feature.create({
                data: {
                    ideaId: data.ideaId,
                    title: data.title,
                    description: data.description,
                    businessValue: data.businessValue,
                    userValue: data.userValue,
                    acceptanceCriteria: data.acceptanceCriteria,
                    source: data.source,
                    priority: data.priority,
                    complexity: data.complexity || "medium",
                    dependencies: data.dependencies,
                    technicalScope: data.technicalScope,
                    suggestedTaskCount: data.suggestedTaskCount || 0,
                },
            }) as IFeature;
        } catch (error) {
            console.error("Prisma createFeature error:", error);
            throw new AppError(500, "Failed to create feature");
        }
    }

    // Get a feature by ID
    async getFeatureById(id: string): Promise<IFeature | null> {
        try {
            return await this.prisma.feature.findUnique({
                where: { id },
            }) as IFeature | null;
        } catch (error) {
            throw new AppError(500, "Failed to fetch feature");
        }
    }

    // Get all features for an idea
    async getFeaturesByIdeaId(ideaId: string): Promise<IFeature[]> {
        try {
            return await this.prisma.feature.findMany({
                where: { ideaId },
                orderBy: { createdAt: "desc" },
            }) as IFeature[];
        } catch (error) {
            throw new AppError(500, "Failed to fetch features");
        }
    }

    // Get feature with tasks and diagram links
    async getFeatureWithTasks(id: string): Promise<IFeatureWithTasks | null> {
        try {
            return await this.prisma.feature.findUnique({
                where: { id },
                include: {
                    tasks: {
                        orderBy: { order: "asc" },
                    },
                    diagramLinks: {
                        include: {
                            diagram: true,
                        },
                    },
                },
            }) as IFeatureWithTasks | null;
        } catch (error) {
            throw new AppError(500, "Failed to fetch feature with tasks");
        }
    }

    // Update a feature
    async updateFeature(
        id: string,
        data: IUpdateFeatureRepositoryData
    ): Promise<IFeature> {
        try {
            return await this.prisma.feature.update({
                where: { id },
                data,
            }) as IFeature;
        } catch (error) {
            console.error("Prisma updateFeature error:", error);
            throw new AppError(500, "Failed to update feature");
        }
    }

    // Delete a feature
    async deleteFeature(id: string): Promise<void> {
        try {
            await this.prisma.feature.delete({
                where: { id },
            });
        } catch (error) {
            throw new AppError(500, "Failed to delete feature");
        }
    }

    // Create a version entry
    async createVersion(
        featureId: string,
        title: string,
        description: string,
        changelog: string | null
    ): Promise<IFeatureVersion> {
        try {
            // Get the current max version
            const maxVersion = await this.prisma.featureVersion.findFirst({
                where: { featureId },
                orderBy: { version: "desc" },
                select: { version: true },
            });

            const nextVersion = maxVersion ? maxVersion.version + 1 : 1;

            const existingFeature = await this.prisma.feature.findUnique({
                where: { id: featureId }
            });

            return await this.prisma.featureVersion.create({
                data: {
                    featureId,
                    version: nextVersion,
                    title,
                    description,
                    businessValue: existingFeature?.businessValue || null,
                    userValue: existingFeature?.userValue || null,
                    acceptanceCriteria: existingFeature?.acceptanceCriteria ?? undefined,
                    priority: existingFeature?.priority || "medium",
                    complexity: existingFeature?.complexity || "medium",
                    dependencies: existingFeature?.dependencies ?? undefined,
                    technicalScope: existingFeature?.technicalScope || null,
                    suggestedTaskCount: existingFeature?.suggestedTaskCount || 0,
                    changelog,
                },
            }) as unknown as IFeatureVersion;
        } catch (error) {
            console.error("Prisma createVersion error:", error);
            throw new AppError(500, "Failed to create feature version");
        }
    }

    // Get version history
    async getVersionHistory(featureId: string): Promise<IFeatureVersion[]> {
        try {
            return await this.prisma.featureVersion.findMany({
                where: { featureId },
                orderBy: { version: "desc" },
            }) as unknown as IFeatureVersion[];
        } catch (error) {
            throw new AppError(500, "Failed to fetch version history");
        }
    }

    // Link feature to diagram
    async linkDiagram(featureId: string, diagramId: string): Promise<void> {
        try {
            await this.prisma.featureDiagramLink.create({
                data: {
                    featureId,
                    diagramId,
                },
            });
        } catch (error) {
            throw new AppError(500, "Failed to link diagram");
        }
    }

    // Unlink feature from diagram
    async unlinkDiagram(featureId: string, diagramId: string): Promise<void> {
        try {
            await this.prisma.featureDiagramLink.deleteMany({
                where: {
                    featureId,
                    diagramId,
                },
            });
        } catch (error) {
            throw new AppError(500, "Failed to unlink diagram");
        }
    }

    // Delete all features for an idea
    async deleteFeaturesByIdeaId(ideaId: string): Promise<void> {
        try {
            await this.prisma.feature.deleteMany({
                where: { ideaId },
            });
        } catch (error) {
            throw new AppError(500, "Failed to delete features for the idea");
        }
    }
}
