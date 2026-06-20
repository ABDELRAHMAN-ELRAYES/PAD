import { Router } from "express";
import {
    generateWorkflow,
    getWorkflowByIdeaId,
    updateWorkflowStep,
    exportWorkflow,
    // Handoff controllers
    compileHandoff,
    getHandoffByIdea,
    getArtifact,
    updateArtifact,
    downloadZip,
    getMasterPrompt,
} from "./workflow.controller";

const router: Router = Router();

// ============================================================
// Legacy Workflow Routes (unchanged)
// ============================================================
router.post("/generate/:ideaId", generateWorkflow);
router.get("/idea/:ideaId", getWorkflowByIdeaId);
router.get("/:id/export", exportWorkflow);
router.patch("/steps/:id", updateWorkflowStep);

// ============================================================
// Handoff Package Routes
// ============================================================
router.get("/handoff/generate/:ideaId", compileHandoff);
router.get("/handoff/idea/:ideaId", getHandoffByIdea);
router.get("/handoff/artifacts/:id", getArtifact);
router.put("/handoff/artifacts/:id", updateArtifact);
router.get("/handoff/download/:packageId", downloadZip);
router.get("/handoff/prompt/:packageId", getMasterPrompt);

export default router;
