import { Router } from "express";
import * as iterationController from "./iteration.controller";

const IterationRouter:Router = Router();

// Get iteration session for an idea
IterationRouter.get("/idea/:ideaId", iterationController.getSession);

// Add a message to an iteration session
IterationRouter.post("/idea/:ideaId/message", iterationController.postMessage);

// Approve a suggestion
IterationRouter.post("/suggestion/:suggestionId/approve", iterationController.approveSuggestion);

export default IterationRouter;
