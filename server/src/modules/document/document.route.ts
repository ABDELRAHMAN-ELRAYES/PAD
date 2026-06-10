import { Router } from "express";
import {
    generateDocuments,
    getDocument,
    getDocumentWithVersions,
    getDocumentsByIdea,
    updateDocument,
    getVersionHistory,
    revertToVersion,
    regenerateDocument,
    exportDocument,
    deleteDocument,
} from "./document.controller";

const DocumentRouter:Router = Router();

// Generate PRD & BRD for an idea
DocumentRouter.post("/generate/:ideaId", generateDocuments);

// Get all documents for an idea
DocumentRouter.get("/idea/:ideaId", getDocumentsByIdea);

// Get a single document
DocumentRouter.get("/:id", getDocument);

// Delete a document
DocumentRouter.delete("/:id", deleteDocument);

// Get document with version history
DocumentRouter.get("/:id/full", getDocumentWithVersions);

// Update a document
DocumentRouter.put("/:id", updateDocument);

// Get version history
DocumentRouter.get("/:id/versions", getVersionHistory);

// Revert to a specific version
DocumentRouter.post("/:id/revert/:version", revertToVersion);

// Regenerate a document
DocumentRouter.post("/:id/regenerate", regenerateDocument);

// Export document
DocumentRouter.get("/:id/export/:format", exportDocument);

export default DocumentRouter;
