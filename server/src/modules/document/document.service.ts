import { NextFunction } from "express";
import AppError from "../../utils/app-error";
import DocumentRepository from "./document.repository";
import IdeaRepository from "../idea/idea.repository";
import AiService from "../ai/ai.service";
import {
    IDocument,
    IDocumentVersion,
    IUpdateDocumentWithChangelogData,
    IDocumentWithVersions,
    DocumentType,
} from "./types/IDocument";
import TurndownService from "turndown";

class DocumentService {
    private static documentRepo: DocumentRepository = DocumentRepository.getInstance();
    private static ideaRepo = IdeaRepository.getInstance();

    // Create placeholder document for a confirmed idea
    static async createPlaceholder(
        ideaId: string,
        type: "PRD" | "BRD",
        next: NextFunction
    ): Promise<IDocument | void> {
        // Get the idea
        const idea = await this.ideaRepo.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        // Check if idea is confirmed
        if (idea.status !== "confirmed") {
            return next(new AppError(400, "Only confirmed ideas can generate documents"));
        }

        // Check if document already exists
        const existingDocs = await this.documentRepo.getDocumentsByIdeaId(ideaId);
        const hasSpecificDoc = existingDocs.some(doc => doc.type === type);
        if (hasSpecificDoc) {
            return next(new AppError(400, `${type} document already exists for this idea.`));
        }

        const title = type === "PRD" 
            ? "Product Requirements Document (PRD)" 
            : "Business Requirements Document (BRD)";

        const document = await this.documentRepo.createDocument({
            ideaId,
            type,
            title,
            content: "",
        });

        // Create initial empty version (v1)
        await this.documentRepo.createVersion(document.id, 1, "", "Placeholder created");

        return document;
    }

    // Generate PRD and/or BRD documents for a confirmed idea
    static async generateDocuments(
        ideaId: string,
        type: "PRD" | "BRD" | undefined,
        next: NextFunction,
        onChunk?: (data: any) => void
    ): Promise<IDocument[] | void> {
        // Get the idea
        const idea = await this.ideaRepo.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        // Check if idea is confirmed
        if (idea.status !== "confirmed") {
            return next(new AppError(400, "Only confirmed ideas can generate documents"));
        }

        // Check if documents already exist
        const existingDocs = await this.documentRepo.getDocumentsByIdeaId(ideaId);
        if (type) {
            const hasSpecificDoc = existingDocs.some(doc => doc.type === type);
            if (hasSpecificDoc) {
                return next(new AppError(400, `${type} document already exists for this idea.`));
            }
        } else {
            if (existingDocs.length > 0) {
                return next(new AppError(400, "Documents already exist for this idea. Please edit the existing documents."));
            }
        }

        const ideaText = idea.businessDescription || idea.refinedText || idea.rawText;
        const analysisResult = idea.analysisResult;

        if (onChunk) {
            // Perform generation and stream directly to callback (HTTP response)
            await this.processDocumentGeneration(ideaId, ideaText, analysisResult, type, onChunk);
        } else {
            // Background generation for sockets
            this.processDocumentGeneration(ideaId, ideaText, analysisResult, type);
        }

        return [];
    }

    private static async processDocumentGeneration(
        ideaId: string,
        ideaText: string,
        analysisResult: any,
        type: "PRD" | "BRD" | undefined,
        onChunk?: (data: any) => void
    ) {
        try {
            const docsCreated: IDocument[] = [];
            const idea = await this.ideaRepo.getIdeaById(ideaId);
            const userId = idea?.userId;

            // 1. Generate PRD
            if (!type || type === "PRD") {
                let prdFullResponse = "";
                const prdStream = AiService.generatePRDStream(ideaText, analysisResult, userId);
                for await (const chunk of prdStream) {
                    prdFullResponse += chunk;
                    const chunkData = {
                        type: "PRD",
                        chunk,
                        fullText: prdFullResponse,
                    };
                    if (onChunk) {
                        onChunk(chunkData);
                    }
                }
                const prdResult = AiService.parseDocumentResult(prdFullResponse);
                if (prdResult) {
                    const prdDoc = await this.documentRepo.createDocument({
                        ideaId,
                        type: "PRD",
                        title: prdResult.title,
                        content: prdResult.content,
                    });
                    await this.documentRepo.createVersion(prdDoc.id, 1, prdResult.content, "Initial generation");
                    docsCreated.push(prdDoc);
                }
            }

            // 2. Generate BRD
            if (!type || type === "BRD") {
                let brdFullResponse = "";
                const brdStream = AiService.generateBRDStream(ideaText, analysisResult, userId);
                for await (const chunk of brdStream) {
                    brdFullResponse += chunk;
                    const chunkData = {
                        type: "BRD",
                        chunk,
                        fullText: brdFullResponse,
                    };
                    if (onChunk) {
                        onChunk(chunkData);
                    }
                }
                const brdResult = AiService.parseDocumentResult(brdFullResponse);
                if (brdResult) {
                    const brdDoc = await this.documentRepo.createDocument({
                        ideaId,
                        type: "BRD",
                        title: brdResult.title,
                        content: brdResult.content,
                    });
                    await this.documentRepo.createVersion(brdDoc.id, 1, brdResult.content, "Initial generation");
                    docsCreated.push(brdDoc);
                }
            }

            if (onChunk) {
                onChunk({ status: "final", documents: docsCreated });
            }
        } catch (error) {
            console.error("AI document generation error:", error);
            const errorMessage = error instanceof Error ? error.message : "Document generation failed";
            
            if (onChunk) {
                onChunk({ status: "error", message: errorMessage });
            }
        }
    }

    // Get a single document
    static async getDocument(
        documentId: string,
        next: NextFunction
    ): Promise<IDocument | void> {
        const document = await this.documentRepo.getDocumentById(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }
        return document;
    }

    // Get document with versions
    static async getDocumentWithVersions(
        documentId: string,
        next: NextFunction
    ): Promise<IDocumentWithVersions | void> {
        const document = await this.documentRepo.getDocumentWithVersions(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }
        return document;
    }

    // Get all documents for an idea
    static async getDocumentsByIdea(
        ideaId: string,
        next: NextFunction
    ): Promise<IDocument[] | void> {
        // Verify idea exists
        const idea = await this.ideaRepo.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        return await this.documentRepo.getDocumentsByIdeaId(ideaId);
    }

    // Update a document (creates new version)
    static async updateDocument(
        documentId: string,
        data: IUpdateDocumentWithChangelogData,
        next: NextFunction
    ): Promise<IDocument | void> {
        const document = await this.documentRepo.getDocumentById(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }

        // If content is being updated, create a new version
        if (data.content && data.content !== document.content) {
            const latestVersion = await this.documentRepo.getLatestVersionNumber(documentId);
            await this.documentRepo.createVersion(
                documentId,
                latestVersion + 1,
                data.content,
                data.changelog || "Content updated"
            );
        }

        // Update the document
        const updatedDoc = await this.documentRepo.updateDocument(documentId, {
            title: data.title,
            content: data.content,
            status: data.status,
        });

        return updatedDoc;
    }

    // Get version history
    static async getVersionHistory(
        documentId: string,
        next: NextFunction
    ): Promise<IDocumentVersion[] | void> {
        const document = await this.documentRepo.getDocumentById(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }

        return await this.documentRepo.getVersionHistory(documentId);
    }

    // Revert to a specific version
    static async revertToVersion(
        documentId: string,
        versionNumber: number,
        next: NextFunction
    ): Promise<IDocument | void> {
        const document = await this.documentRepo.getDocumentById(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }

        const version = await this.documentRepo.getVersion(documentId, versionNumber);
        if (!version) {
            return next(new AppError(404, "Version not found"));
        }

        // Create a new version with reverted content
        const latestVersion = await this.documentRepo.getLatestVersionNumber(documentId);
        await this.documentRepo.createVersion(
            documentId,
            latestVersion + 1,
            version.content,
            `Reverted to version ${versionNumber}`
        );

        // Update document with reverted content
        const updatedDoc = await this.documentRepo.updateDocument(documentId, {
            content: version.content,
        });

        return updatedDoc;
    }

    // Regenerate a specific document type (Streaming)
    static async regenerateDocument(
        documentId: string,
        next: NextFunction,
        onChunk?: (chunk: any) => void
    ): Promise<void> {
        const document = await this.documentRepo.getDocumentWithVersions(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }

        // Get the idea
        const idea = await this.ideaRepo.getIdeaById(document.ideaId);
        if (!idea) {
            return next(new AppError(404, "Associated idea not found"));
        }

        const ideaText = idea.businessDescription || idea.refinedText || idea.rawText;
        const analysisResult = idea.analysisResult;
        const type = document.type as DocumentType;

        try {
            let fullResponse = "";
            const stream = type === "PRD" 
                ? AiService.generatePRDStream(ideaText, analysisResult, idea.userId)
                : AiService.generateBRDStream(ideaText, analysisResult, idea.userId);

            for await (const chunk of stream) {
                fullResponse += chunk;
                if (onChunk) {
                    onChunk({
                        documentId,
                        type,
                        chunk,
                        fullText: fullResponse,
                    });
                }
            }

            const result = AiService.parseDocumentResult(fullResponse);
            if (result) {
                const latestVersion = await this.documentRepo.getLatestVersionNumber(documentId);
                await this.documentRepo.createVersion(
                    documentId,
                    latestVersion + 1,
                    result.content,
                    "Regenerated by AI"
                );

                const updatedDoc = await this.documentRepo.updateDocument(documentId, {
                    title: result.title,
                    content: result.content,
                });

                if (onChunk) {
                    onChunk({ status: "final", document: updatedDoc });
                }
            }
        } catch (error) {
            console.error("Document regeneration error:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to regenerate document";
            if (onChunk) {
                onChunk({ status: "error", message: errorMessage });
            }
        }
    }


    // Delete a document
    static async deleteDocument(
        documentId: string,
        next: NextFunction
    ): Promise<void> {
        const document = await this.documentRepo.getDocumentById(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }

        await this.documentRepo.deleteDocument(documentId);
    }

    // Export document as specific format (returns content for client-side processing)
    static async exportDocument(
        documentId: string,
        format: "markdown" | "html",
        next: NextFunction
    ): Promise<{ content: string; filename: string; mimeType: string } | void> {
        const document = await this.documentRepo.getDocumentById(documentId);
        if (!document) {
            return next(new AppError(404, "Document not found"));
        }

        const baseFilename = `${document.title.replace(/[^a-zA-Z0-9]/g, "_")}`;

        switch (format) {
            case "markdown":
                const turndownService = new TurndownService();
                const markdown = turndownService.turndown(document.content);
                return {
                    content: `# ${document.title}\n\n${markdown}`,
                    filename: `${baseFilename}.md`,
                    mimeType: "text/markdown",
                };
            case "html":
                return {
                    content: this.convertToHtml(document.title, document.content),
                    filename: `${baseFilename}.html`,
                    mimeType: "text/html",
                };
            default:
                return next(new AppError(400, "Unsupported export format"));
        }
    }

    // Helper to convert content to HTML
    private static convertToHtml(title: string, content: string): string {
        // Content is already HTML from the rich text editor, so we just wrap it
        const html = content;

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #1a1a1a; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${html}
</body>
</html>`;
    }
}

export default DocumentService;
