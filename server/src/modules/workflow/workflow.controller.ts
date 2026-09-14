import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
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
} from "@nestjs/swagger";
import * as fs from "fs";
import { WorkflowService } from "./workflow.service";
import {
  HandoffCompilerService,
  SSEStreamWriter,
} from "./handoff-compiler.service";
import {
  HandoffRepository,
} from "./workflow.repository";
import { IdeaRepository } from "../idea/idea.repository";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/IUser";
import { UpdateWorkflowStepDto } from "./dto/update-workflow-step.dto";
import { UpdateArtifactDto } from "./dto/update-artifact.dto";

@ApiTags("workflow")
@Controller("workflow")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly handoffCompilerService: HandoffCompilerService,
    private readonly handoffRepo: HandoffRepository,
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

  // ============================================================
  // Workflow Execution Endpoints
  // ============================================================

  @Post("generate/:ideaId")
  @ApiOperation({ summary: "Generate workflow DAG steps via streaming" })
  async generateWorkflow(
    @Param("ideaId") ideaId: string,
    @CurrentUser() user: IUser,
    @Res() res: Response,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      await this.workflowService.generateWorkflow(ideaId, (chunk) => {
        res.write(JSON.stringify(chunk) + "\n");
      });
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ status: "error", message: "Workflow generation failed" });
      } else {
        res.end();
      }
    }
  }

  @Get("idea/:ideaId")
  @ApiOperation({ summary: "Get workflow steps for an idea" })
  @SwaggerApiResponse({ status: 200, description: "Workflow retrieved" })
  async getWorkflowByIdeaId(
    @Param("ideaId") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const workflow = await this.workflowService.getWorkflowByIdeaId(ideaId);
    return { workflow };
  }

  @Patch("steps/:id")
  @ApiOperation({ summary: "Update workflow step status or instructions" })
  @SwaggerApiResponse({ status: 200, description: "Workflow step updated" })
  async updateWorkflowStep(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowStepDto,
    @CurrentUser() _user: IUser,
  ) {
    const step = await this.workflowService.updateWorkflowStep(id, dto);
    return {
      message: "Workflow step updated successfully",
      step,
    };
  }

  @Get(":id/export")
  @ApiOperation({ summary: "Export workflow as formatted markdown instructions" })
  @SwaggerApiResponse({ status: 200, description: "Workflow exported" })
  async exportWorkflow(
    @Param("id") id: string,
    @CurrentUser() _user: IUser,
  ) {
    const markdown = await this.workflowService.exportWorkflow(id);
    return { export: markdown };
  }

  // ============================================================
  // Handoff Package Endpoints
  // ============================================================

  @Get("handoff/generate/:ideaId")
  @ApiOperation({ summary: "Stream compile AI IDE handoff package via SSE" })
  async compileHandoff(
    @Param("ideaId") ideaId: string,
    @CurrentUser() user: IUser,
    @Res() res: Response,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const sse = new SSEStreamWriter(res);

    try {
      await this.handoffCompilerService.compilePackage(ideaId, sse);
    } catch (err: any) {
      sse.error(err?.message || "Compilation failed");
    } finally {
      res.end();
    }
  }

  @Get("handoff/idea/:ideaId")
  @ApiOperation({ summary: "Get latest handoff package metadata for an idea" })
  @SwaggerApiResponse({ status: 200, description: "Handoff package retrieved" })
  async getHandoffByIdea(
    @Param("ideaId") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const pkg = await this.handoffRepo.getLatestPackageByIdeaId(ideaId);
    return { package: pkg };
  }

  @Get("handoff/artifacts/:id")
  @ApiOperation({ summary: "Get a specific handoff artifact by ID" })
  @SwaggerApiResponse({ status: 200, description: "Artifact retrieved" })
  async getArtifact(
    @Param("id") id: string,
    @CurrentUser() _user: IUser,
  ) {
    const artifact = await this.handoffRepo.getArtifactById(id);
    if (!artifact) {
      throw new NotFoundException("Artifact not found.");
    }
    return { artifact };
  }

  @Put("handoff/artifacts/:id")
  @ApiOperation({ summary: "Update handoff artifact content" })
  @SwaggerApiResponse({ status: 200, description: "Artifact updated" })
  async updateArtifact(
    @Param("id") id: string,
    @Body() dto: UpdateArtifactDto,
    @CurrentUser() _user: IUser,
  ) {
    const updated = await this.handoffRepo.updateArtifactContent(
      id,
      dto.content,
      dto.changelog,
    );
    return { artifact: updated };
  }

  @Get("handoff/download/:packageId")
  @ApiOperation({ summary: "Download handoff ZIP archive" })
  async downloadZip(
    @Param("packageId") packageId: string,
    @CurrentUser() _user: IUser,
    @Res() res: Response,
  ) {
    const pkg = await this.handoffRepo.getPackageWithArtifacts(packageId);
    if (!pkg) {
      throw new NotFoundException("Package not found.");
    }

    if (!pkg.zipPath || !fs.existsSync(pkg.zipPath)) {
      throw new NotFoundException(
        "ZIP file not found. Please regenerate the package.",
      );
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=handoff-${pkg.ideaId}-v${pkg.version}.zip`,
    );

    const fileStream = fs.createReadStream(pkg.zipPath);
    fileStream.pipe(res);
  }

  @Get("handoff/prompt/:packageId")
  @ApiOperation({ summary: "Get combined master prompt string for clipboard" })
  @SwaggerApiResponse({ status: 200, description: "Master prompt retrieved" })
  async getMasterPrompt(
    @Param("packageId") packageId: string,
    @CurrentUser() _user: IUser,
  ) {
    const promptText =
      await this.handoffCompilerService.compileMasterPromptString(packageId);
    return { prompt: promptText };
  }
}
