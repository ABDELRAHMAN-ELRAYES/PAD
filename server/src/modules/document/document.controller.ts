import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import AppError from "../../utils/app-error";
import DocumentService from "./document.service";
import { IUpdateDocumentWithChangelogData, DocumentType } from "./types/IDocument";

// Generate documents for an idea (creates placeholder and returns it)
export const generateDocuments = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = Array.isArray(request.params.ideaId) ? request.params.ideaId[0] : request.params.ideaId;
        const type = request.query.type as DocumentType;
        const supportedTypes: DocumentType[] = [
            "BRD",
            "PRD",
            "SRS",
            "FRS",
            "SYSTEM_ARCH",
            "API_SPEC",
            "TEST_PLAN",
            "USER_MANUAL",
            "SECURITY_PLAN"
        ];

        if (!type || !supportedTypes.includes(type)) {
            return next(new AppError(400, `Valid document type (${supportedTypes.join(", ")}) is required`));
        }

        const document = await DocumentService.createPlaceholder(ideaId, type, next);
        if (!document) return;

        response.status(201).json({
            status: "success",
            data: { document },
        });
    }
);

// Get a single document
export const getDocument = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        const document = await DocumentService.getDocument(documentId, next);
        if (!document) return;

        response.status(200).json({
            status: "success",
            data: { document },
        });
    }
);

// Get document with version history
export const getDocumentWithVersions = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        const document = await DocumentService.getDocumentWithVersions(documentId, next);
        if (!document) return;

        response.status(200).json({
            status: "success",
            data: { document },
        });
    }
);

// Get all documents for an idea
export const getDocumentsByIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = Array.isArray(request.params.ideaId) ? request.params.ideaId[0] : request.params.ideaId;

        const documents = await DocumentService.getDocumentsByIdea(ideaId, next);
        if (!documents) return;

        response.status(200).json({
            status: "success",
            data: { documents, count: documents.length },
        });
    }
);

// Update a document
export const updateDocument = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        const data: IUpdateDocumentWithChangelogData = {
            title: request.body.title,
            content: request.body.content,
            status: request.body.status,
            changelog: request.body.changelog,
        };

        const document = await DocumentService.updateDocument(documentId, data, next);
        if (!document) return;

        response.status(200).json({
            status: "success",
            message: "Document updated successfully",
            data: { document },
        });
    }
);

// Get version history
export const getVersionHistory = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        const versions = await DocumentService.getVersionHistory(documentId, next);
        if (!versions) return;

        response.status(200).json({
            status: "success",
            data: { versions, count: versions.length },
        });
    }
);

// Revert to a specific version
export const revertToVersion = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        const versionNumber = parseInt(Array.isArray(request.params.version) ? request.params.version[0] : request.params.version, 10);

        if (isNaN(versionNumber)) {
            response.status(400).json({
                status: "fail",
                message: "Invalid version number",
            });
            return;
        }

        const document = await DocumentService.revertToVersion(documentId, versionNumber, next);
        if (!document) return;

        response.status(200).json({
            status: "success",
            message: `Reverted to version ${versionNumber}`,
            data: { document },
        });
    }
);

// Regenerate a document (Streaming)
export const regenerateDocument = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        // Set headers for streaming
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Transfer-Encoding", "chunked");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        try {
            await DocumentService.regenerateDocument(documentId, next, (chunk) => {
                response.write(JSON.stringify(chunk) + "\n");
            });
            response.end();
        } catch (err) {
            if (!response.headersSent) {
                return next(err);
            }
            console.error("Document regeneration streaming error:", err);
            response.end();
        }
    }
);

// Export document
export const exportDocument = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        const format = request.params.format as "markdown" | "html";

        if (!["markdown", "html"].includes(format)) {
            response.status(400).json({
                status: "fail",
                message: "Unsupported format. Use 'markdown' or 'html'",
            });
            return;
        }

        const result = await DocumentService.exportDocument(documentId, format, next);
        if (!result) return;

        response.setHeader("Content-Type", result.mimeType);
        response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        response.status(200).send(result.content);
    }
);

// Delete a document
export const deleteDocument = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const documentId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

        await DocumentService.deleteDocument(documentId, next);

        response.status(204).json({
            status: "success",
            data: null,
        });
    }
);
