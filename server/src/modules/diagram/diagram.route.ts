import { Router } from "express";
import {
    generateDiagrams,
    generateDiagramStream,
    regenerateDiagramStream,
    repairDiagram,
    importDiagram,
    getDiagramsByIdea,
    getDiagram,
    getDiagramWithVersions,
    updateDiagram,
    getDiagramVersions,
} from "./diagram.controller";

const DiagramRouter: Router = Router();

// Initialize/Generate diagrams placeholder list for an idea
DiagramRouter.post("/generate/:ideaId", generateDiagrams);

// Stream diagram generation (SSE)
DiagramRouter.get("/:id/generate-stream", generateDiagramStream);

// Stream diagram regeneration (SSE)
DiagramRouter.get("/:id/regenerate-stream", regenerateDiagramStream);

// Repair invalid Mermaid diagram syntax
DiagramRouter.post("/:id/repair", repairDiagram);

// Import a custom diagram
DiagramRouter.post("/:id/import", importDiagram);

// Get all diagrams for an idea
DiagramRouter.get("/idea/:ideaId", getDiagramsByIdea);

// Get a single diagram
DiagramRouter.get("/:id", getDiagram);

// Get diagram with version history
DiagramRouter.get("/:id/full", getDiagramWithVersions);

// Update a diagram
DiagramRouter.put("/:id", updateDiagram);

// Get version history for a diagram
DiagramRouter.get("/:id/versions", getDiagramVersions);

export default DiagramRouter;
