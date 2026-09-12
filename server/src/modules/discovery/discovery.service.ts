import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { DiscoveryRepository } from "./discovery.repository";
import { IdeaRepository } from "../idea/idea.repository";
import AiService from "../ai/ai.service";
import {
  QUESTIONNAIRE_SYSTEM_PROMPT,
  buildQuestionnairePrompt,
} from "./prompts/questionnaire.prompt";
import SocketService from "../../services/socket.service";
import {
  IDiscoveryQuestionnaire,
  IDiscoveryAnswer,
} from "./types/discovery.interface";

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private static instance: DiscoveryService;

  constructor(
    private readonly discoveryRepo: DiscoveryRepository,
    private readonly ideaRepo: IdeaRepository,
  ) {
    DiscoveryService.instance = this;
  }

  static getInstance(): DiscoveryService {
    return DiscoveryService.instance;
  }

  async generateQuestionnaire(ideaId: string): Promise<IDiscoveryQuestionnaire> {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    // Set idea status to 'draft' during generation if needed
    await this.ideaRepo.updateStatus(ideaId, "draft");

    try {
      const sourceText = idea.businessDescription || idea.rawText;
      const prompt = buildQuestionnairePrompt(sourceText);
      const response = await AiService.callLLM(
        prompt,
        true,
        QUESTIONNAIRE_SYSTEM_PROMPT,
        idea.userId,
      );
      const parsed = AiService.robustJSONParse<any>(response);

      if (!parsed || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid questionnaire JSON structure received from AI");
      }

      // Save questionnaire and its questions
      const questionnaire = await this.discoveryRepo.saveQuestionnaire(
        ideaId,
        parsed.questions,
      );

      // Update idea status to questionnaire_ready
      const updatedIdea = await this.ideaRepo.updateStatus(
        ideaId,
        "questionnaire_ready",
      );

      // Emit to WebSocket room
      const socketService = SocketService.getInstance();
      socketService.emitToRoom(ideaId, "discovery:questionnaire_ready", {
        idea: updatedIdea,
        questionnaire,
      });

      return questionnaire;
    } catch (error) {
      this.logger.error(`Error generating discovery questionnaire for idea ${ideaId}:`, error);
      const socketService = SocketService.getInstance();
      socketService.emitToRoom(ideaId, "discovery:error", {
        message: "Failed to generate questionnaire.",
      });
      throw new InternalServerErrorException(
        "Failed to generate discovery questionnaire",
      );
    }
  }

  async getQuestionnaire(ideaId: string): Promise<IDiscoveryQuestionnaire | null> {
    return this.discoveryRepo.getQuestionnaireByIdeaId(ideaId);
  }

  async submitResponses(
    ideaId: string,
    responses: Array<{
      questionId?: string;
      questionKey?: string;
      label?: string;
      value: any;
    }>,
  ): Promise<IDiscoveryAnswer[]> {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    const savedAnswers = await this.discoveryRepo.saveAnswers(ideaId, responses);

    // Update status to questionnaire_complete
    const updatedIdea = await this.ideaRepo.updateStatus(
      ideaId,
      "questionnaire_complete",
    );

    // Emit to WebSocket room
    const socketService = SocketService.getInstance();
    socketService.emitToRoom(ideaId, "discovery:submitted", {
      idea: updatedIdea,
      response: savedAnswers,
    });

    return savedAnswers;
  }
}
