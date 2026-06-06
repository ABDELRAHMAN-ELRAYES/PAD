import { Router } from "express";
import * as iterationController from "./iteration.controller";

const IterationRouter:Router = Router();

// Get (or auto-create) iteration session for an idea
IterationRouter.get("/idea/:ideaId", iterationController.getSession);

// Add a message to an iteration session
IterationRouter.post("/idea/:ideaId/message", iterationController.postMessage);

// Approve a suggestion
IterationRouter.post("/suggestion/:suggestionId/approve", iterationController.approveSuggestion);

// Reject a suggestion
IterationRouter.post("/suggestion/:suggestionId/reject", iterationController.rejectSuggestion);

// ── Plan Endpoints ──────────────────────────────────────────

// Generate a modification plan preview
IterationRouter.post("/idea/:ideaId/plan", iterationController.generatePlan);

// Get a plan by ID
IterationRouter.get("/plan/:planId", iterationController.getPlan);

// Confirm and execute a plan
IterationRouter.post("/idea/:ideaId/plan/:planId/confirm", iterationController.confirmPlan);

// Get change history for an idea
IterationRouter.get("/idea/:ideaId/history", iterationController.getChangeHistory);

// Rollback a plan
IterationRouter.post("/idea/:ideaId/plan/:planId/rollback", iterationController.rollbackPlan);

export default IterationRouter;
