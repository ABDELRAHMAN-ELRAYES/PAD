import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { IRService } from "./ir.service";
import { IdeaRepository } from "../idea/idea.repository";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/IUser";
import { UpdateIRDto } from "./dto/update-ir.dto";
import { PatchIRDto } from "./dto/patch-ir.dto";
import { CompileIRDto } from "./dto/compile-ir.dto";

@ApiTags("ir")
@Controller("ideas/:id/ir")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IRController {
  constructor(
    private readonly irService: IRService,
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

  @Get()
  @ApiOperation({ summary: "Get current Project IR and version history for an idea" })
  @SwaggerApiResponse({ status: 200, description: "Project IR retrieved successfully" })
  async getIR(
    @Param("id") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const ir = await this.irService.getIR(ideaId);
    return { ir };
  }

  @Post("generate")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Generate initial Project IR from idea description" })
  @SwaggerApiResponse({ status: 201, description: "Project IR generated" })
  async generateInitialIR(
    @Param("id") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const ir = await this.irService.generateInitialIR(ideaId, user.id);
    return {
      message: "Intermediate Representation generated successfully",
      ir,
    };
  }

  @Post()
  @ApiOperation({ summary: "Update Project IR directly via schema editor" })
  @SwaggerApiResponse({ status: 200, description: "Project IR updated" })
  async updateIR(
    @Param("id") ideaId: string,
    @Body() dto: UpdateIRDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const result = await this.irService.updateIRDirectly(
      ideaId,
      dto.schemaData,
      dto.changelog || "Manual tree edits",
    );
    return {
      message: "IR updated successfully",
      ...result,
    };
  }

  @Post("patch")
  @ApiOperation({ summary: "Patch/Modify Project IR using natural language prompt" })
  @SwaggerApiResponse({ status: 200, description: "Project IR patched" })
  async patchIR(
    @Param("id") ideaId: string,
    @Body() dto: PatchIRDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const ir = await this.irService.patchIR(ideaId, dto.requestText, user.id);
    return {
      message: "IR patched successfully using natural language modifications",
      ir,
    };
  }

  @Post("compile")
  @ApiOperation({ summary: "Compile unified Project IR into OpenAPI spec, documents, and diagrams" })
  @SwaggerApiResponse({ status: 200, description: "System compiled successfully from IR" })
  async compileIR(
    @Param("id") ideaId: string,
    @Body() dto: CompileIRDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const compileResult = await this.irService.compileIR(
      ideaId,
      dto.selectedDiagrams,
      user.id,
    );
    return {
      message: "System compiled from Intermediate Representation successfully",
      ...compileResult,
    };
  }
}
