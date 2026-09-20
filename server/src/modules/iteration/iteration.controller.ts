import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { IterationService } from "./iteration.service";
import { IdeaRepository } from "../idea/idea.repository";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/IUser";
import { CreateIterationMessageDto } from "./dto/create-iteration-message.dto";

@ApiTags("iterations")
@Controller("iterations")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IterationController {
  constructor(
    private readonly iterationService: IterationService,
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

  @Get("idea/:ideaId")
  @ApiOperation({ summary: "Get (or auto-create) iteration session for an idea" })
  @SwaggerApiResponse({ status: 200, description: "Iteration session retrieved or created" })
  async getSession(
    @Param("ideaId") ideaId: string,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const session = await this.iterationService.getOrCreateSession(ideaId);
    return { session };
  }

  @Post("idea/:ideaId/message")
  @ApiOperation({ summary: "Add a message or feedback to an iteration session" })
  @SwaggerApiResponse({ status: 201, description: "Message added and background feedback processing started" })
  async postMessage(
    @Param("ideaId") ideaId: string,
    @Body() dto: CreateIterationMessageDto,
    @CurrentUser() user: IUser,
  ) {
    await this.assertIdeaOwnership(ideaId, user.id);
    const message = await this.iterationService.addMessage(
      ideaId,
      "user",
      dto.content.trim(),
    );
    return { message };
  }
}
