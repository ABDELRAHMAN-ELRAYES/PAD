import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { DiagramService } from "./diagram.service";
import { DiagramRepository } from "./diagram.repository";
import { IdeaRepository } from "../idea/idea.repository";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/IUser";
import { UpdateDiagramDto } from "./dto/update-diagram.dto";
import { RepairDiagramDto } from "./dto/repair-diagram.dto";
import { ImportDiagramDto } from "./dto/import-diagram.dto";

@ApiTags("diagrams")
@Controller("diagrams")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiagramController {
  constructor(
    private readonly diagramService: DiagramService,
    private readonly diagramRepo: DiagramRepository,
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

  private async assertDiagramOwnership(diagramId: string, userId: string) {
    const diagram = await this.diagramRepo.getDiagramById(diagramId);
    if (!diagram) {
      throw new NotFoundException("Diagram not found");
    }
    await this.assertIdeaOwnership(diagram.ideaId, userId);
    return diagram;
  }

  @Post("generate/:ideaId")
  @ApiOperation({ summary: "Initialize diagrams or create placeholders for an idea" })
  @ApiQuery({ name: "type", required: false })
  @SwaggerApiResponse({ status: 200, description: "Diagram placeholders initialized" })
  async generateDiagrams(
    @Param("ideaId") ideaId: string,
    @Query("type") type: string | undefined,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);

    let diagrams;
    if (type) {
      diagrams = await this.diagramService.initializeSelectedDiagrams(ideaId, [type]);
    } else {
      diagrams = await this.diagramService.initializeDiagrams(ideaId);
    }

    return { diagrams };
  }

  @Get(":id/generate-stream")
  @ApiOperation({ summary: "Stream diagram generation via Server-Sent Events (SSE)" })
  async generateDiagramStream(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Res() res: Response,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    await this.diagramService.generateDiagramStream(id, res);
  }

  @Get(":id/regenerate-stream")
  @ApiOperation({ summary: "Stream diagram regeneration via Server-Sent Events (SSE)" })
  async regenerateDiagramStream(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
    @Res() res: Response,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    await this.diagramService.regenerateDiagramStream(id, res);
  }

  @Post(":id/repair")
  @ApiOperation({ summary: "Repair invalid Mermaid diagram syntax" })
  @SwaggerApiResponse({ status: 200, description: "Diagram repaired" })
  async repairDiagram(
    @Param("id") id: string,
    @Body() dto: RepairDiagramDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    const diagram = await this.diagramService.repairDiagram(
      id,
      dto.code,
      dto.errorMessage,
    );
    return { diagram };
  }

  @Post(":id/import")
  @ApiOperation({ summary: "Import custom Mermaid code into diagram" })
  @SwaggerApiResponse({ status: 200, description: "Custom diagram imported" })
  async importDiagram(
    @Param("id") id: string,
    @Body() dto: ImportDiagramDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    const diagram = await this.diagramService.updateDiagram(id, {
      mermaidCode: dto.code,
      title: dto.title,
      activeTier: null,
      changelog: "Imported Mermaid file",
    });
    return { diagram };
  }

  @Get("idea/:ideaId")
  @ApiOperation({ summary: "Get all diagrams for an idea" })
  @SwaggerApiResponse({ status: 200, description: "Diagrams retrieved" })
  async getDiagramsByIdea(
    @Param("ideaId") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const diagrams = await this.diagramService.getDiagramsByIdea(ideaId);
    return { diagrams, count: diagrams.length };
  }

  @Get(":id/full")
  @ApiOperation({ summary: "Get diagram with version history" })
  @SwaggerApiResponse({ status: 200, description: "Diagram with versions retrieved" })
  async getDiagramWithVersions(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    const diagram = await this.diagramService.getDiagramWithVersions(id);
    return { diagram };
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "Get version history for a diagram" })
  @SwaggerApiResponse({ status: 200, description: "Version history retrieved" })
  async getDiagramVersions(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    const versions = await this.diagramService.getDiagramVersions(id);
    return { versions, count: versions.length };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single diagram by ID" })
  @SwaggerApiResponse({ status: 200, description: "Diagram retrieved" })
  async getDiagram(
    @Param("id") id: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    const diagram = await this.diagramService.getDiagram(id);
    return { diagram };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update diagram content or metadata" })
  @SwaggerApiResponse({ status: 200, description: "Diagram updated" })
  async updateDiagram(
    @Param("id") id: string,
    @Body() dto: UpdateDiagramDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertDiagramOwnership(id, user.id);
    const diagram = await this.diagramService.updateDiagram(id, dto);
    return { diagram };
  }
}
