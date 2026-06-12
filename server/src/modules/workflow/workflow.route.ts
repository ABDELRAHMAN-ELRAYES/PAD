import { Router } from "express";
import {
    generateWorkflow,
    getWorkflowByIdeaId,
    updateWorkflowStep,
    exportWorkflow,
} from "./workflow.controller";

const router: Router = Router();

// Run middleware for all workflow routes to ensure authentication
//router.use(AuthMiddleware.protect);

// Workflow Generation and Fetching
router.post("/generate/:ideaId", generateWorkflow);
router.get("/idea/:ideaId", getWorkflowByIdeaId);

// Exporting
router.get("/:id/export", exportWorkflow);

// Step Management
router.patch("/steps/:id", updateWorkflowStep);

export default router;
