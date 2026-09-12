import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { DocumentService } from "./document.service";
import { DocumentRepository } from "./document.repository";
import { IdeaRepository } from "../idea/idea.repository";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/IUser";
import { DocumentType } from "./types/IDocument";
import { UpdateDocumentDto } from "./dto/update-document.dto";

const SUPPORTED_DOCUMENT_TYPES: DocumentType[] = [
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

@ApiTags("documents")
@Controller("documents")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly documentRepo: DocumentRepository,
    private readonly ideaRepo: IdeaRepository,
  ) {}

  private async assertIdeaOwnership(ideaId: string, userId: string) {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }
    if (idea.userId !== userId) {
      throw new ForbiddenException("You do not have access to this idea");
    }
    return idea;
  }

  private async assertDocumentOwnership(documentId: string, userId: string) {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundException("Document not found");
    }
    await this.assertIdeaOwnership(document.ideaId, userId);
    return document;
  }

  @Post("generate/:ideaId")
  @ApiOperation({ summary: "Create placeholder document for a confirmed idea" })
  @ApiQuery({ name: "type", enum: SUPPORTED_DOCUMENT_TYPES })
  @SwaggerApiResponse({ status: 201, description: "Document placeholder created" })
  async generateDocuments(
    @Param("ideaId") ideaId: string,
    @Query("type") type: DocumentType,
    @CurrentUser() user: IUser,
  ) {
    if (!type || !SUPPORTED_DOCUMENT_TYPES.includes(type)) {
      throw new BadRequestException(
        `Valid document type (${SUPPORTED_DOCUMENT_TYPES.join(", ")}) is required`,
      );
    }

    await this.assertIdeaOwnership(ideaId, user.id);
    const document = await this.documentService.createPlaceholder(ideaId, type);

    return { document };
  }

  @Get("idea/:ideaId")
  @ApiOperation({ summary: "Get all documents for an idea" })
  @SwaggerApiResponse({ status: 200, description: "Documents list retrieved" })
  async getDocumentsByIdea(
    @Param("ideaId") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const documents = await this.documentService.getDocumentsByIdea(ideaId);

    return { documents, count: documents.length };
  }

  @Get(":id/full")
  @ApiOperation({ summary: "Get document with full version history" })
  @SwaggerApiResponse({ status: 200, description: "Document with versions retrieved" })
  async getDocumentWithVersions(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDocumentOwnership(id, user.id);
    const document = await this.documentService.getDocumentWithVersions(id);

    return { document };
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "Get document version history" })
  @SwaggerApiResponse({ status: 200, description: "Version history retrieved" })
  async getVersionHistory(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDocumentOwnership(id, user.id);
    const versions = await this.documentService.getVersionHistory(id);

    return { versions, count: versions.length };
  }

  @Post(":id/revert/:version")
  @ApiOperation({ summary: "Revert document to a specific version" })
  @SwaggerApiResponse({ status: 200, description: "Document reverted successfully" })
  async revertToVersion(
    @Param("id") id: string,
    @Param("version") versionParam: string,
    @CurrentUser() user: IUser,
  ) {
    const versionNumber = parseInt(versionParam, 10);
    if (isNaN(versionNumber)) {
      throw new BadRequestException("Invalid version number");
    }

    await this.assertDocumentOwnership(id, user.id);
    const document = await this.documentService.revertToVersion(id, versionNumber);

    return {
      message: `Reverted to version ${versionNumber}`,
      document,
    };
  }

  @Post(":id/regenerate")
  @ApiOperation({ summary: "Regenerate a document via AI streaming" })
  async regenerateDocument(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Res() response: Response,
  ) {
    await this.assertDocumentOwnership(id, user.id);

    response.setHeader("Content-Type", "application/json");
    response.setHeader("Transfer-Encoding", "chunked");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    try {
      await this.documentService.regenerateDocument(id, (chunk) => {
        response.write(JSON.stringify(chunk) + "\n");
      });
      response.end();
    } catch (err) {
      if (!response.headersSent) {
        response.status(500).json({ status: "error", message: "Regeneration failed" });
      } else {
        response.end();
      }
    }
  }

  @Get(":id/export/:format")
  @ApiOperation({ summary: "Export document as markdown or html" })
  @ApiParam({ name: "format", enum: ["markdown", "html"] })
  async exportDocument(
    @Param("id") id: string,
    @Param("format") format: "markdown" | "html",
    @CurrentUser() user: IUser,
    @Res() response: Response,
  ) {
    if (!["markdown", "html"].includes(format)) {
      throw new BadRequestException("Unsupported format. Use 'markdown' or 'html'");
    }

    await this.assertDocumentOwnership(id, user.id);
    const result = await this.documentService.exportDocument(id, format);

    response.setHeader("Content-Type", result.mimeType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    response.status(200).send(result.content);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single document by ID" })
  @SwaggerApiResponse({ status: 200, description: "Document retrieved" })
  async getDocument(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDocumentOwnership(id, user.id);
    const document = await this.documentService.getDocument(id);

    return { document };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update document content or metadata" })
  @SwaggerApiResponse({ status: 200, description: "Document updated" })
  async updateDocument(
    @Param("id") id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDocumentOwnership(id, user.id);
    const document = await this.documentService.updateDocument(id, dto);

    return {
      message: "Document updated successfully",
      document,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a document" })
  @SwaggerApiResponse({ status: 204, description: "Document deleted" })
  async deleteDocument(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDocumentOwnership(id, user.id);
    await this.documentService.deleteDocument(id);
    return null;
  }
}
