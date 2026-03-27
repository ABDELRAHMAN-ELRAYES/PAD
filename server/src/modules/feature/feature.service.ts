import { NextFunction } from "express";
import FeatureRepository from "./feature.repository";
import AppError from "../../utils/app-error";
import {
    ICreateFeatureData,
    IUpdateFeatureData,
    IFeature,
    IFeatureVersion,
    IFeatureWithTasks,
    ICreateFeatureRepositoryData,
} from "./types/IFeature";
import AIService from "../ai/ai.service";
import DocumentService from "../document/document.service";

export default class FeatureService {
    private static repository = FeatureRepository.getInstance();

    // Extract features from PRD/BRD using AI
    static async extractFeaturesFromDocuments(
        ideaId: string,
        next: NextFunction,
        onChunk?: (data: any) => void
    ): Promise<IFeature[] | undefined> {
        // Get all documents for the idea
        const documents = await DocumentService.getDocumentsByIdea(ideaId, next);
        if (!documents || documents.length === 0) {
            next(new AppError(404, "No documents found for this idea. Please generate PRD/BRD first."));
            return;
        }

        // Combine PRD and BRD content
        const combinedContent = documents
            .map((doc) => `### ${doc.type}: ${doc.title}\n\n${doc.content}`)
            .join("\n\n---\n\n");

        if (onChunk) {
            // Perform extraction and stream directly to callback (HTTP response)
            await this.processFeatureExtraction(ideaId, combinedContent, onChunk);
        } else {
            // Background extraction (still used by some parts, but without sockets for now)
            this.processFeatureExtraction(ideaId, combinedContent);
        }

        return [];
    }

    private static async processFeatureExtraction(ideaId: string, combinedContent: string, onChunk?: (data: any) => void) {
        let fullResponse = "";

        try {
            const stream = AIService.generateFeaturesStream(combinedContent);

            for await (const chunk of stream) {
                fullResponse += chunk;
                const chunkData = {
                    chunk,
                    fullText: fullResponse,
                };
                if (onChunk) {
                    onChunk(chunkData);
                }
            }

            // Parse AI response to extract features
            const featuresData = this.parseAIFeaturesResponse(fullResponse);

            // Create features in database
            const createdFeatures: IFeature[] = [];
            for (const featureData of featuresData) {
                const repositoryData: ICreateFeatureRepositoryData = {
                    ideaId,
                    title: featureData.title,
                    description: featureData.description,
                    source: "auto",
                    priority: "medium",
                };

                const feature = await this.repository.createFeature(repositoryData);
                createdFeatures.push(feature);
            }

            if (onChunk) {
                onChunk({ status: "final", features: createdFeatures });
            }
        } catch (error) {
            console.error("AI feature extraction error:", error);
            const errorMessage = error instanceof Error ? error.message : "Feature extraction failed";
            
            if (onChunk) {
                onChunk({ status: "error", message: errorMessage });
            }
        }
    }

    // Parse AI response to extract features
    private static parseAIFeaturesResponse(response: string): Array<{ title: string; description: string }> {
        try {
            // Try to find JSON in the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }

            const features = JSON.parse(jsonMatch[0]);
            return features.map((f: any) => ({
                title: f.title || "Untitled Feature",
                description: f.description || "No description provided",
            }));
        } catch (error) {
            // Fallback: return a single feature with the whole response
            return [{
                title: "Extracted Feature",
                description: response.substring(0, 500),
            }];
        }
    }

    // Create a new feature
    static async createFeature(
        ideaId: string,
        data: ICreateFeatureData,
        next: NextFunction
    ): Promise<IFeature | void> {
        // Validate input
        if (!data.title || data.title.trim().length < 3) {
            return next(new AppError(400, "Feature title must be at least 3 characters"));
        }

        if (!data.description || data.description.trim().length < 10) {
            return next(new AppError(400, "Feature description must be at least 10 characters"));
        }

        const repositoryData: ICreateFeatureRepositoryData = {
            ideaId,
            title: data.title.trim(),
            description: data.description.trim(),
            source: data.source || "manual",
            priority: data.priority || "medium",
        };

        return await this.repository.createFeature(repositoryData);
    }

    // Get a feature by ID
    static async getFeature(
        id: string,
        next: NextFunction
    ): Promise<IFeature | undefined |void> {
        const feature = await this.repository.getFeatureById(id);

        if (!feature) {
            return next(new AppError(404, "Feature not found"));
        }

        return feature;
    }

    // Get all features for an idea
    static async getFeaturesByIdea(
        ideaId: string,
        _next: NextFunction
    ): Promise<IFeature[] | undefined> {
        return await this.repository.getFeaturesByIdeaId(ideaId);
    }

    // Get feature with tasks
    static async getFeatureWithTasks(
        id: string,
        _next: NextFunction
    ): Promise<IFeatureWithTasks | void>{
        const feature = await this.repository.getFeatureWithTasks(id);

        if (!feature) {
            return _next(new AppError(404, "Feature not found"));
        }

        return feature;
    }

    // Update a feature
    static async updateFeature(
        id: string,
        data: IUpdateFeatureData,
        next: NextFunction
    ): Promise<IFeature | void> {
        // Check if feature exists
        const existingFeature = await this.repository.getFeatureById(id);
        if (!existingFeature) {
            return next(new AppError(404, "Feature not found"));
        }

        // Create version entry if title or description changed
        if (data.title || data.description) {
            await this.repository.createVersion(
                id,
                data.title || existingFeature.title,
                data.description || existingFeature.description,
                data.changelog || null
            );
        }

        // Update feature
        const updateData = {
            title: data.title,
            description: data.description,
            priority: data.priority,
            status: data.status,
        };

        return await this.repository.updateFeature(id, updateData);
    }

    // Delete a feature
    static async deleteFeature(
        id: string,
        next: NextFunction
    ): Promise<void> {
        // Check if feature exists
        const existingFeature = await this.repository.getFeatureById(id);
        if (!existingFeature) {
            return next(new AppError(404, "Feature not found"));
        }

        await this.repository.deleteFeature(id);
    }

    // Get version history
    static async getVersionHistory(
        id: string,
        next: NextFunction
    ): Promise<IFeatureVersion[] | void> {
        // Check if feature exists
        const existingFeature = await this.repository.getFeatureById(id);
        if (!existingFeature) {
            return next(new AppError(404, "Feature not found"));
        }

        return await this.repository.getVersionHistory(id);
    }

    // Link feature to diagram
    static async linkToDiagram(
        featureId: string,
        diagramId: string,
        _next: NextFunction
    ): Promise<void> {
        // Verify feature exists
        const feature = await this.repository.getFeatureById(featureId);
        if (!feature) {
            return _next(new AppError(404, "Feature not found"));
        }

        await this.repository.linkDiagram(featureId, diagramId);
    }

    // Unlink feature from diagram
    static async unlinkFromDiagram(
        featureId: string,
        diagramId: string,
        _next: NextFunction
    ): Promise<void> {
        await this.repository.unlinkDiagram(featureId, diagramId);
    }
}
