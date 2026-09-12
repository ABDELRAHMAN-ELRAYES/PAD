import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse as SwaggerApiResponse } from "@nestjs/swagger";
import { DiscoveryService } from "./discovery.service";
import { IdeaRepository } from "../idea/idea.repository";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/IUser";
import { SubmitQuestionnaireDto } from "./dto/submit-questionnaire.dto";

@ApiTags("discovery")
@Controller("ideas/:id/questionnaire")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly ideaRepo: IdeaRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get discovery questionnaire for an idea" })
  @SwaggerApiResponse({ status: 200, description: "Questionnaire retrieved successfully" })
  @SwaggerApiResponse({ status: 404, description: "Idea not found" })
  @SwaggerApiResponse({ status: 403, description: "Forbidden" })
  async getQuestionnaire(
    @Param("id") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    if (idea.userId !== user.id) {
      throw new ForbiddenException("You do not have access to this idea");
    }

    const questionnaire = await this.discoveryService.getQuestionnaire(ideaId);
    return { questionnaire };
  }

  @Post("submit")
  @ApiOperation({ summary: "Submit answers for discovery questionnaire" })
  @SwaggerApiResponse({ status: 200, description: "Questionnaire submitted successfully" })
  @SwaggerApiResponse({ status: 404, description: "Idea not found" })
  @SwaggerApiResponse({ status: 403, description: "Forbidden" })
  async submitQuestionnaire(
    @Param("id") ideaId: string,
    @Body() dto: SubmitQuestionnaireDto,
    @CurrentUser() user: IUser,
  ) {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    if (idea.userId !== user.id) {
      throw new ForbiddenException("You do not have access to this idea");
    }

    const result = await this.discoveryService.submitResponses(
      ideaId,
      dto.responses,
    );

    return { response: result };
  }

  @Post("regenerate")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger discovery questionnaire regeneration asynchronously" })
  @SwaggerApiResponse({ status: 202, description: "Questionnaire generation triggered" })
  @SwaggerApiResponse({ status: 404, description: "Idea not found" })
  @SwaggerApiResponse({ status: 403, description: "Forbidden" })
  async regenerateQuestionnaire(
    @Param("id") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    if (idea.userId !== user.id) {
      throw new ForbiddenException("You do not have access to this idea");
    }

    // Trigger regeneration asynchronously
    this.discoveryService.generateQuestionnaire(ideaId).catch((err) => {
      console.error("Async questionnaire generation failed:", err);
    });

    return { message: "Questionnaire generation triggered" };
  }
}
