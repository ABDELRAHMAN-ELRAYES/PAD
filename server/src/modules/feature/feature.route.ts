import { Router } from "express";
import {
    extractFeatures,
    createFeature,
    getFeature,
    getFeaturesByIdea,
    getFeatureWithTasks,
    updateFeature,
    deleteFeature,
    getVersionHistory,
    linkDiagram,
    unlinkDiagram,
} from "./feature.controller";

const FeatureRouter: Router = Router();

// TODO: Re-enable authentication before production
// All routes require authentication
// FeatureRouter.use(AuthMiddleware.protect);

// Extract features from PRD/BRD
FeatureRouter.route("/extract/:ideaId")
    .post(extractFeatures);

// Base routes
FeatureRouter.route("/")
    .post(createFeature);

// Get features by idea
FeatureRouter.route("/idea/:ideaId")
    .get(getFeaturesByIdea);

// Specific feature routes
FeatureRouter.route("/:id")
    .get(getFeature)
    .put(updateFeature)
    .delete(deleteFeature);

// Get feature with tasks
FeatureRouter.route("/:id/full")
    .get(getFeatureWithTasks);

// Version history
FeatureRouter.route("/:id/versions")
    .get(getVersionHistory);

// Diagram linking
FeatureRouter.route("/:id/diagrams/:diagramId")
    .post(linkDiagram)
    .delete(unlinkDiagram);

export default FeatureRouter;
