import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import {
    createIdea,
    getIdea,
    listMyIdeas,
    analyzeIdea,
    refineIdea,
    confirmIdea,
    streamBusinessDescription,
} from "./idea.controller";

const IdeaRouter: Router = Router();

// All routes require authentication
IdeaRouter.use(AuthMiddleware.protect);

// Base routes
IdeaRouter.route("/")
    .post(createIdea)
    .get(listMyIdeas);

// Specific idea routes
IdeaRouter.route("/:id")
    .get(getIdea);

IdeaRouter.route("/:id/analyze")
    .post(analyzeIdea);

IdeaRouter.route("/:id/refine")
    .post(refineIdea);

IdeaRouter.route("/:id/confirm")
    .post(confirmIdea);

IdeaRouter.route("/:id/business-description/stream")
    .post(streamBusinessDescription);

export default IdeaRouter;
