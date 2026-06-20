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
    Priority,
} from "./types/IFeature";
import AIService from "../ai/ai.service";
import PrismaClientSingleton from "../../data-server-clients/prisma-client";

export default class FeatureService {
    private static repository = FeatureRepository.getInstance();

    // Extract features from all available project artifacts using AI
    static async extractFeaturesFromDocuments(
        ideaId: string,
        next: NextFunction,
        onChunk?: (data: any) => void
    ): Promise<IFeature[] | undefined> {
        const prisma = PrismaClientSingleton.getPrismaClient();

        // 1. Fetch Idea and its complete context (Questionnaire, Research, Docs, Diagrams, IR)
        const idea = await prisma.idea.findUnique({
            where: { id: ideaId },
            include: {
                discoveryQuestionnaire: true,
                questionnaireResponse: true,
                researchJob: true,
                projectIR: true,
                documents: true,
                diagrams: true,
            }
        });

        if (!idea) {
            next(new AppError(404, "Idea not found. Please create an idea first."));
            return;
        }

        const context = {
            rawText: idea.businessDescription || idea.rawText,
            refinedText: idea.refinedText,
            analysisResult: idea.analysisResult,
            researchResult: idea.researchResult,
            questionnaire: idea.discoveryQuestionnaire,
            questionnaireResponse: idea.questionnaireResponse,
            documents: idea.documents.map(d => ({ type: d.type, title: d.title, content: d.content })),
            diagrams: idea.diagrams.map(d => ({ type: d.type, title: d.title, mermaidCode: d.mermaidCode })),
            projectIR: idea.projectIR
        };

        if (onChunk) {
            // Perform extraction and stream directly to callback (HTTP response)
            await this.processFeatureExtraction(ideaId, context, onChunk);
        } else {
            // Background extraction
            this.processFeatureExtraction(ideaId, context);
        }

        return [];
    }

    private static async processFeatureExtraction(ideaId: string, context: any, onChunk?: (data: any) => void) {
        let fullResponse = "";

        try {
            const stream = AIService.generateFeaturesStream(context);

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

            // Delete old features for this idea first to avoid duplication
            await this.repository.deleteFeaturesByIdeaId(ideaId);

            // Create features in database
            const createdFeatures: IFeature[] = [];
            for (const featureData of featuresData) {
                const repositoryData: ICreateFeatureRepositoryData = {
                    ideaId,
                    title: featureData.title,
                    description: featureData.description,
                    businessValue: featureData.businessValue,
                    userValue: featureData.userValue,
                    acceptanceCriteria: featureData.acceptanceCriteria,
                    source: "auto",
                    priority: featureData.priority || "medium",
                    complexity: featureData.complexity || "medium",
                    dependencies: featureData.dependencies || [],
                    technicalScope: featureData.technicalScope,
                    suggestedTaskCount: featureData.suggestedTaskCount || 0,
                };

                const feature = await this.repository.createFeature(repositoryData);
                createdFeatures.push(feature);
            }

            // Resolve dependencies from title strings to actual feature IDs
            const titleToIdMap = new Map<string, string>();
            for (const f of createdFeatures) {
                titleToIdMap.set(f.title.toLowerCase().trim(), f.id);
            }

            for (const f of createdFeatures) {
                const rawDeps = f.dependencies;
                if (Array.isArray(rawDeps)) {
                    const resolvedIds = rawDeps
                        .map(depTitle => titleToIdMap.get(depTitle.toLowerCase().trim()))
                        .filter(Boolean) as string[];
                    
                    await this.repository.updateFeature(f.id, {
                        dependencies: resolvedIds
                    });
                    f.dependencies = resolvedIds;
                }
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

    // Safely normalize feature keys from LLM output, handling snake_case, casing mismatches, whitespace, hyphens, and undefined fields.
    private static normalizeFeatureData(f: any, defaults: Partial<any> = {}): any {
        if (!f || typeof f !== "object") return null;

        const normalizedKeysObj: Record<string, string> = {};
        for (const k of Object.keys(f)) {
            normalizedKeysObj[k.toLowerCase().replace(/[\s\-_]/g, "")] = k;
        }

        const getVal = (keys: string[], defaultVal: any) => {
            for (const k of keys) {
                if (normalizedKeysObj[k] !== undefined) {
                    return f[normalizedKeysObj[k]];
                }
            }
            return defaultVal;
        };

        const title = getVal(["title", "name", "featuretitle", "featurename", "header", "summary"], defaults.title || "Untitled Feature");
        const description = getVal(["description", "desc", "featuredescription", "details", "text"], defaults.description || "No description provided");
        const businessValue = getVal(["businessvalue", "businessvaluespecification", "business", "value"], defaults.businessValue || null);
        const userValue = getVal(["uservalue", "uservaluespecification", "user", "benefit"], defaults.userValue || null);
        
        let acceptanceCriteria = getVal(["acceptancecriteria", "criteria", "requirements", "tests"], defaults.acceptanceCriteria || []);
        if (typeof acceptanceCriteria === "string") {
            acceptanceCriteria = [acceptanceCriteria];
        }

        const priority = getVal(["priority", "importance"], defaults.priority || "medium");
        const complexity = getVal(["complexity", "difficulty", "size"], defaults.complexity || "medium");
        
        let dependencies = getVal(["dependencies", "dependson", "dep", "deps", "predecessors"], defaults.dependencies || []);
        if (typeof dependencies === "string") {
            dependencies = [dependencies];
        }

        const technicalScope = getVal(["technicalscope", "techscope", "technical", "scope", "implementation"], defaults.technicalScope || null);
        
        let suggestedTaskCount = getVal(["suggestedtaskcount", "taskcount", "tasks", "count"], defaults.suggestedTaskCount || 0);
        if (typeof suggestedTaskCount !== "number") {
            suggestedTaskCount = parseInt(suggestedTaskCount as any) || 0;
        }

        return {
            title: String(title),
            description: String(description),
            businessValue: businessValue ? String(businessValue) : null,
            userValue: userValue ? String(userValue) : null,
            acceptanceCriteria: Array.isArray(acceptanceCriteria) ? acceptanceCriteria.map(String) : [],
            priority: String(priority),
            complexity: String(complexity),
            dependencies: Array.isArray(dependencies) ? dependencies.map(String) : [],
            technicalScope: technicalScope ? String(technicalScope) : null,
            suggestedTaskCount
        };
    }

    // Parse AI response to extract features
    private static parseAIFeaturesResponse(response: string): Array<any> {
        let features: any = null;

        // Try direct robust JSON parsing
        try {
            features = AIService.robustJSONParse<any[]>(response);
        } catch (_) {}

        // Fallback to matching array regex if robust parse didn't yield an array
        if (!features || !Array.isArray(features)) {
            try {
                const jsonMatch = response.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    features = JSON.parse(jsonMatch[0]);
                }
            } catch (_) {}
        }

        // If we got a valid array, map it
        if (features && Array.isArray(features)) {
            return features.map((f: any) => this.normalizeFeatureData(f));
        }

        // If it parsed as a single object, wrap it
        if (features && typeof features === "object" && (features.title || features.name || features.feature_title)) {
            const normalized = this.normalizeFeatureData(features);
            if (normalized) {
                return [normalized];
            }
        }

        console.error("AI Feature generation returned malformed content:", response);
        throw new Error("AI returned a malformed response that could not be parsed as valid JSON. Please retry generation.");
    }

    // Create a new feature manually
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
            businessValue: data.businessValue,
            userValue: data.userValue,
            acceptanceCriteria: data.acceptanceCriteria || [],
            source: data.source || "manual",
            priority: data.priority || "medium",
            complexity: data.complexity || "medium",
            dependencies: data.dependencies || [],
            technicalScope: data.technicalScope,
            suggestedTaskCount: data.suggestedTaskCount || 0
        };

        return await this.repository.createFeature(repositoryData);
    }

    // Get a feature by ID
    static async getFeature(
        id: string,
        next: NextFunction
    ): Promise<IFeature | undefined | void> {
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
                data.changelog || "Manual update"
            );
        }

        // Update feature
        const updateData = {
            title: data.title,
            description: data.description,
            businessValue: data.businessValue,
            userValue: data.userValue,
            acceptanceCriteria: data.acceptanceCriteria,
            priority: data.priority,
            complexity: data.complexity,
            dependencies: data.dependencies,
            technicalScope: data.technicalScope,
            suggestedTaskCount: data.suggestedTaskCount,
            status: data.status,
        };

        return await this.repository.updateFeature(id, updateData);
    }

    // Regenerate a single feature using AI
    static async regenerateSingleFeature(
        featureId: string,
        next: NextFunction
    ): Promise<IFeature | void> {
        const feature = await this.repository.getFeatureById(featureId);
        if (!feature) {
            return next(new AppError(404, "Feature not found"));
        }

        const ideaId = feature.ideaId;
        const prisma = PrismaClientSingleton.getPrismaClient();

        const idea = await prisma.idea.findUnique({
            where: { id: ideaId },
            include: {
                discoveryQuestionnaire: true,
                questionnaireResponse: true,
                researchJob: true,
                projectIR: true,
                documents: true,
                diagrams: true,
            }
        });

        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        const context = {
            rawText: idea.businessDescription || idea.rawText,
            refinedText: idea.refinedText,
            analysisResult: idea.analysisResult,
            researchResult: idea.researchResult,
            questionnaire: idea.discoveryQuestionnaire,
            questionnaireResponse: idea.questionnaireResponse,
            documents: idea.documents.map(d => ({ type: d.type, title: d.title, content: d.content })),
            diagrams: idea.diagrams.map(d => ({ type: d.type, title: d.title, mermaidCode: d.mermaidCode })),
            projectIR: idea.projectIR
        };

        const allFeatures = await this.repository.getFeaturesByIdeaId(ideaId);
        const otherFeatures = allFeatures.filter(f => f.id !== featureId);

        try {
            const aiResponse = await AIService.regenerateSingleFeature(
                feature.title,
                feature.description,
                otherFeatures,
                context
            );

            let updatedData: any = null;
            try {
                updatedData = AIService.robustJSONParse<any>(aiResponse);
            } catch (_) {
                try {
                    const parsed = JSON.parse(aiResponse);
                    updatedData = Array.isArray(parsed) ? parsed[0] : parsed;
                } catch (_) {}
            }

            if (!updatedData || typeof updatedData !== "object") {
                return next(new AppError(500, "AI failed to generate a valid feature schema"));
            }

            // Create version history entry first
            await this.repository.createVersion(
                featureId,
                feature.title,
                feature.description,
                "Regenerated feature using AI"
            );

            const normalized = this.normalizeFeatureData(updatedData, feature);
            return await this.repository.updateFeature(featureId, normalized);
        } catch (error) {
            console.error("AI single feature regeneration error:", error);
            return next(new AppError(500, "Failed to regenerate feature using AI"));
        }
    }

    // Merge multiple features together
    static async mergeFeatures(
        ideaId: string,
        featureIds: string[],
        next: NextFunction
    ): Promise<IFeature | void> {
        if (!featureIds || featureIds.length < 2) {
            return next(new AppError(400, "At least two features must be selected to merge"));
        }

        const prisma = PrismaClientSingleton.getPrismaClient();

        // 1. Fetch features
        const features = await prisma.feature.findMany({
            where: {
                id: { in: featureIds },
                ideaId
            }
        });

        if (features.length !== featureIds.length) {
            return next(new AppError(404, "One or more features to merge were not found"));
        }

        // 2. Consolidate attributes
        const mergedTitle = features.map(f => f.title).join(" & ");
        const mergedDesc = features.map(f => `### ${f.title}\n${f.description}`).join("\n\n");
        const mergedBizVal = features.map(f => f.businessValue ? `### ${f.title}\n${f.businessValue}` : "").filter(Boolean).join("\n\n");
        const mergedUserVal = features.map(f => f.userValue ? `### ${f.title}\n${f.userValue}` : "").filter(Boolean).join("\n\n");
        
        let mergedCriteria: string[] = [];
        for (const f of features) {
            if (Array.isArray(f.acceptanceCriteria)) {
                mergedCriteria = [...mergedCriteria, ...(f.acceptanceCriteria as string[])];
            }
        }
        mergedCriteria = Array.from(new Set(mergedCriteria));

        let mergedDeps: string[] = [];
        for (const f of features) {
            if (Array.isArray(f.dependencies)) {
                mergedDeps = [...mergedDeps, ...(f.dependencies as string[])];
            }
        }
        mergedDeps = Array.from(new Set(mergedDeps)).filter(id => !featureIds.includes(id));

        const mergedTechScope = features.map(f => f.technicalScope ? `### ${f.title}\n${f.technicalScope}` : "").filter(Boolean).join("\n\n");
        const totalSuggestedTaskCount = features.reduce((sum, f) => sum + (f.suggestedTaskCount || 0), 0);

        // 3. Create the new merged feature
        const mergedFeature = await this.repository.createFeature({
            ideaId,
            title: mergedTitle,
            description: mergedDesc,
            businessValue: mergedBizVal,
            userValue: mergedUserVal,
            acceptanceCriteria: mergedCriteria,
            source: "manual",
            priority: features.some(f => f.priority === "critical") ? "critical" :
                      features.some(f => f.priority === "high") ? "high" : "medium",
            complexity: features.some(f => f.complexity === "high") ? "high" : "medium",
            dependencies: mergedDeps,
            technicalScope: mergedTechScope,
            suggestedTaskCount: totalSuggestedTaskCount
        });

        // 4. Re-associate tasks
        await prisma.task.updateMany({
            where: { featureId: { in: featureIds } },
            data: { featureId: mergedFeature.id }
        });

        // 5. Delete old features
        await prisma.feature.deleteMany({
            where: { id: { in: featureIds } }
        });

        return mergedFeature;
    }

    // Split a feature into multiple features
    static async splitFeature(
        featureId: string,
        splits: Array<{
            title: string;
            description: string;
            businessValue?: string;
            userValue?: string;
            acceptanceCriteria?: string[];
            priority?: string;
            complexity?: string;
            technicalScope?: string;
            suggestedTaskCount?: number;
        }>,
        next: NextFunction
    ): Promise<IFeature[] | void> {
        if (!splits || splits.length < 2) {
            return next(new AppError(400, "You must provide details for at least two split target features"));
        }

        const feature = await this.repository.getFeatureById(featureId);
        if (!feature) {
            return next(new AppError(404, "Feature not found"));
        }

        const prisma = PrismaClientSingleton.getPrismaClient();
        const createdFeatures: IFeature[] = [];

        // 1. Create the split features
        for (const split of splits) {
            const splitFeature = await this.repository.createFeature({
                ideaId: feature.ideaId,
                title: split.title,
                description: split.description,
                businessValue: split.businessValue || feature.businessValue,
                userValue: split.userValue || feature.userValue,
                acceptanceCriteria: split.acceptanceCriteria || [],
                source: "manual",
                priority: (split.priority || feature.priority) as Priority,
                complexity: split.complexity || feature.complexity,
                dependencies: feature.dependencies || [],
                technicalScope: split.technicalScope || feature.technicalScope,
                suggestedTaskCount: split.suggestedTaskCount || 0
            });
            createdFeatures.push(splitFeature);
        }

        // 2. Re-associate existing tasks to the first split feature
        if (createdFeatures.length > 0) {
            await prisma.task.updateMany({
                where: { featureId },
                data: { featureId: createdFeatures[0].id }
            });
        }

        // 3. Delete the original feature
        await this.repository.deleteFeature(featureId);

        return createdFeatures;
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
