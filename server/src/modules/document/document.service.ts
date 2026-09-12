import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { DocumentRepository } from "./document.repository";
import { IdeaRepository } from "../idea/idea.repository";
import AiService from "../ai/ai.service";
import {
  IDocument,
  IDocumentVersion,
  IUpdateDocumentWithChangelogData,
  IDocumentWithVersions,
  DocumentType,
} from "./types/IDocument";
import TurndownService from "turndown";

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private static instance: DocumentService;

  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly ideaRepo: IdeaRepository,
  ) {
    DocumentService.instance = this;
  }

  static getInstance(): DocumentService {
    return DocumentService.instance;
  }

  // Helper to get friendly titles for types
  getFriendlyDocumentTitle(type: string): string {
    switch (type) {
      case "BRD":
        return "Business Requirements Document (BRD)";
      case "PRD":
        return "Product Requirements Document (PRD)";
      case "SRS":
        return "Software Requirements Specification (SRS)";
      case "FRS":
        return "Functional Requirements Specification (FRS)";
      case "SYSTEM_ARCH":
        return "System Architecture Document (SAD)";
      case "API_SPEC":
        return "API Specification (API Spec)";
      case "TEST_PLAN":
        return "QA & Test Plan";
      case "USER_MANUAL":
        return "User Guide & Manual";
      case "SECURITY_PLAN":
        return "Security & Compliance Plan";
      default:
        return `${type} Specification`;
    }
  }

  static getFriendlyDocumentTitle(type: string): string {
    return DocumentService.getInstance()?.getFriendlyDocumentTitle(type) || `${type} Specification`;
  }

  // Initialize selected documents
  async initializeSelectedDocuments(
    ideaId: string,
    selectedTypes: string[],
  ): Promise<IDocument[]> {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    const created: IDocument[] = [];
    for (const type of selectedTypes) {
      const title = this.getFriendlyDocumentTitle(type);
      const document = await this.documentRepo.createDocument({
        ideaId,
        type: type as DocumentType,
        title,
        content: "",
      });
      await this.documentRepo.createVersion(
        document.id,
        1,
        "",
        "Placeholder created",
      );
      created.push(document);
    }
    return created;
  }

  // Create placeholder document for a confirmed idea
  async createPlaceholder(
    ideaId: string,
    type: DocumentType,
  ): Promise<IDocument> {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    if (idea.status !== "confirmed") {
      throw new BadRequestException("Only confirmed ideas can generate documents");
    }

    const existingDocs = await this.documentRepo.getDocumentsByIdeaId(ideaId);
    const hasSpecificDoc = existingDocs.some((doc) => doc.type === type);
    if (hasSpecificDoc) {
      throw new BadRequestException(`${type} document already exists for this idea.`);
    }

    const title = this.getFriendlyDocumentTitle(type);
    const document = await this.documentRepo.createDocument({
      ideaId,
      type,
      title,
      content: "",
    });

    await this.documentRepo.createVersion(
      document.id,
      1,
      "",
      "Placeholder created",
    );

    return document;
  }

  // Generate documents for a confirmed idea
  async generateDocuments(
    ideaId: string,
    type: DocumentType | undefined,
    onChunk?: (data: any) => void,
  ): Promise<IDocument[]> {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    if (idea.status !== "confirmed") {
      throw new BadRequestException("Only confirmed ideas can generate documents");
    }

    const existingDocs = await this.documentRepo.getDocumentsByIdeaId(ideaId);
    if (type) {
      const hasSpecificDoc = existingDocs.some((doc) => doc.type === type);
      if (hasSpecificDoc) {
        throw new BadRequestException(`${type} document already exists for this idea.`);
      }
    } else {
      if (existingDocs.length > 0) {
        throw new BadRequestException(
          "Documents already exist for this idea. Please edit the existing documents.",
        );
      }
    }

    const ideaText =
      idea.businessDescription || idea.refinedText || idea.rawText;
    const analysisResult = idea.analysisResult;

    if (onChunk) {
      await this.processDocumentGeneration(
        ideaId,
        ideaText,
        analysisResult,
        type,
        onChunk,
      );
    } else {
      this.processDocumentGeneration(
        ideaId,
        ideaText,
        analysisResult,
        type,
      ).catch((err) => {
        this.logger.error("Background document generation error:", err);
      });
    }

    return [];
  }

  private async processDocumentGeneration(
    ideaId: string,
    ideaText: string,
    analysisResult: any,
    type: DocumentType | undefined,
    onChunk?: (data: any) => void,
  ) {
    try {
      const docsCreated: IDocument[] = [];
      const idea = await this.ideaRepo.findById(ideaId);
      const userId = idea?.userId;

      const typesToGenerate: DocumentType[] = type
        ? [type]
        : [
            "BRD",
            "PRD",
            "SRS",
            "FRS",
            "SYSTEM_ARCH",
            "API_SPEC",
            "TEST_PLAN",
            "USER_MANUAL",
            "SECURITY_PLAN",
          ];

      for (const docType of typesToGenerate) {
        let fullResponse = "";
        const stream = AiService.generateDocumentStream(
          docType,
          ideaText,
          analysisResult,
          userId,
        );
        for await (const chunk of stream) {
          fullResponse += chunk;
          const chunkData = {
            type: docType,
            chunk,
            fullText: fullResponse,
          };
          if (onChunk) {
            onChunk(chunkData);
          }
        }
        const result = AiService.parseDocumentResult(fullResponse);
        if (result) {
          const doc = await this.documentRepo.createDocument({
            ideaId,
            type: docType,
            title: result.title,
            content: result.content,
          });
          await this.documentRepo.createVersion(
            doc.id,
            1,
            result.content,
            "Initial generation",
          );
          docsCreated.push(doc);
        }
      }

      if (onChunk) {
        onChunk({ status: "final", documents: docsCreated });
      }
    } catch (error) {
      this.logger.error("AI document generation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Document generation failed";

      if (onChunk) {
        onChunk({ status: "error", message: errorMessage });
      }
    }
  }

  async getDocument(documentId: string): Promise<IDocument> {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }
    return document;
  }

  async getDocumentWithVersions(
    documentId: string,
  ): Promise<IDocumentWithVersions> {
    const document = await this.documentRepo.getDocumentWithVersions(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }
    return document;
  }

  async getDocumentsByIdea(ideaId: string): Promise<IDocument[]> {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }
    return this.documentRepo.getDocumentsByIdeaId(ideaId);
  }

  async updateDocument(
    documentId: string,
    data: IUpdateDocumentWithChangelogData,
  ): Promise<IDocument> {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }

    if (data.content && data.content !== document.content) {
      const latestVersion =
        await this.documentRepo.getLatestVersionNumber(documentId);
      await this.documentRepo.createVersion(
        documentId,
        latestVersion + 1,
        data.content,
        data.changelog || "Content updated",
      );
    }

    const updatedDoc = await this.documentRepo.updateDocument(documentId, {
      title: data.title,
      content: data.content,
      status: data.status,
    });

    return updatedDoc;
  }

  async getVersionHistory(documentId: string): Promise<IDocumentVersion[]> {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }
    return this.documentRepo.getVersionHistory(documentId);
  }

  async revertToVersion(
    documentId: string,
    versionNumber: number,
  ): Promise<IDocument> {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const version = await this.documentRepo.getVersion(
      documentId,
      versionNumber,
    );
    if (!version) {
      throw new NotFoundException("Version not found");
    }

    const latestVersion =
      await this.documentRepo.getLatestVersionNumber(documentId);
    await this.documentRepo.createVersion(
      documentId,
      latestVersion + 1,
      version.content,
      `Reverted to version ${versionNumber}`,
    );

    const updatedDoc = await this.documentRepo.updateDocument(documentId, {
      content: version.content,
    });

    return updatedDoc;
  }

  async regenerateDocument(
    documentId: string,
    onChunk?: (chunk: any) => void,
  ): Promise<void> {
    const document = await this.documentRepo.getDocumentWithVersions(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const idea = await this.ideaRepo.findById(document.ideaId);
    if (!idea) {
      throw new NotFoundException("Associated idea not found");
    }

    const ideaText =
      idea.businessDescription || idea.refinedText || idea.rawText;
    const analysisResult = idea.analysisResult;
    const type = document.type as DocumentType;

    try {
      let fullResponse = "";
      const stream = AiService.generateDocumentStream(
        type,
        ideaText,
        analysisResult,
        idea.userId,
      );

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
        const latestVersion =
          await this.documentRepo.getLatestVersionNumber(documentId);
        await this.documentRepo.createVersion(
          documentId,
          latestVersion + 1,
          result.content,
          "Regenerated by AI",
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
      this.logger.error("Document regeneration error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to regenerate document";
      if (onChunk) {
        onChunk({ status: "error", message: errorMessage });
      }
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }
    await this.documentRepo.deleteDocument(documentId);
  }

  async exportDocument(
    documentId: string,
    format: "markdown" | "html",
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const baseFilename = `${document.title.replace(/[^a-zA-Z0-9]/g, "_")}`;

    switch (format) {
      case "markdown": {
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(document.content);
        return {
          content: `# ${document.title}\n\n${markdown}`,
          filename: `${baseFilename}.md`,
          mimeType: "text/markdown",
        };
      }
      case "html":
        return {
          content: this.convertToHtml(document.title, document.content),
          filename: `${baseFilename}.html`,
          mimeType: "text/html",
        };
      default:
        throw new BadRequestException("Unsupported export format");
    }
  }

  private convertToHtml(title: string, content: string): string {
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
    ${content}
</body>
</html>`;
  }
}

export default DocumentService;
