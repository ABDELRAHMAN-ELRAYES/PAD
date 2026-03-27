import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import FeatureService from "./feature.service";
import { ICreateFeatureData, IUpdateFeatureData } from "./types/IFeature";

// Extract features from PRD/BRD
export const extractFeatures = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = Array.isArray(request.params.ideaId) ? request.params.ideaId[0] : request.params.ideaId;

        // Set headers for streaming
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Transfer-Encoding", "chunked");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        try {
            await FeatureService.extractFeaturesFromDocuments(ideaId, next, (chunk) => {
                response.write(JSON.stringify(chunk) + "\n");
            });
            response.end();
        } catch (err) {
            if (!response.headersSent) {
                return next(err);
            }
            console.error("Feature extraction streaming error:", err);
            response.end();
        }
    }
);

// Create a new feature
export const createFeature = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = Array.isArray(request.params.ideaId) ? request.params.ideaId[0] : request.params.ideaId;
        const data: ICreateFeatureData = {
            title: request.body.title,
            description: request.body.description,
            source: request.body.source,
            priority: request.body.priority,
        };

        const feature = await FeatureService.createFeature(ideaId, data, next);
        if (!feature) return;

        response.status(201).json({
            status: "success",
            message: "Feature created successfully",
            data: { feature },
        });
    }
);

// Get a single feature
export const getFeature = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        const feature = await FeatureService.getFeature(featureId, next);
        if (!feature) return;

        response.status(200).json({
            status: "success",
            data: { feature },
        });
    }
);

// Get all features for an idea
export const getFeaturesByIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = Array.isArray(request.params.ideaId) ? request.params.ideaId[0] : request.params.ideaId;

        const features = await FeatureService.getFeaturesByIdea(ideaId, next);
        if (!features) return;

        response.status(200).json({
            status: "success",
            data: { features, count: features.length },
        });
    }
);

// Get feature with tasks
export const getFeatureWithTasks = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        const feature = await FeatureService.getFeatureWithTasks(featureId, next);
        if (!feature) return;

        response.status(200).json({
            status: "success",
            data: { feature },
        });
    }
);

// Update a feature
export const updateFeature = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        const data: IUpdateFeatureData = {
            title: request.body.title,
            description: request.body.description,
            priority: request.body.priority,
            status: request.body.status,
            changelog: request.body.changelog,
        };

        const feature = await FeatureService.updateFeature(featureId, data, next);
        if (!feature) return;

        response.status(200).json({
            status: "success",
            message: "Feature updated successfully",
            data: { feature },
        });
    }
);

// Delete a feature
export const deleteFeature = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        await FeatureService.deleteFeature(featureId, next);

        response.status(204).json({
            status: "success",
            message: "Feature deleted successfully",
        });
    }
);

// Get version history
export const getVersionHistory = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        const versions = await FeatureService.getVersionHistory(featureId, next);
        if (!versions) return;

        response.status(200).json({
            status: "success",
            data: { versions, count: versions.length },
        });
    }
);

// Link feature to diagram
export const linkDiagram = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        const diagramId = Array.isArray(request.params.diagramId) ? request.params.diagramId[0] : request.params.diagramId;

        await FeatureService.linkToDiagram(featureId, diagramId, next);

        response.status(200).json({
            status: "success",
            message: "Diagram linked to feature successfully",
        });
    }
);

// Unlink feature from diagram
export const unlinkDiagram = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        const diagramId = Array.isArray(request.params.diagramId) ? request.params.diagramId[0] : request.params.diagramId;

        await FeatureService.unlinkFromDiagram(featureId, diagramId, next);

        response.status(200).json({
            status: "success",
            message: "Diagram unlinked from feature successfully",
        });
    }
);
