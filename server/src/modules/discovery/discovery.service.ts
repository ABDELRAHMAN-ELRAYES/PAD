import PrismaClientSingleton from "../../data-server-clients/prisma-client";
import AiService from "../ai/ai.service";
import { QUESTIONNAIRE_SYSTEM_PROMPT, buildQuestionnairePrompt } from "./prompts/questionnaire.prompt";
import SocketService from "../../services/socket.service";
import AppError from "../../utils/app-error";

export default class DiscoveryService {
  private static prisma = PrismaClientSingleton.getPrismaClient();

  static async generateQuestionnaire(ideaId: string): Promise<any> {
    const idea = await this.prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) throw new AppError(404, "Idea not found");

    // Save status to DB first if it's draft, so UI knows it's generating
    await this.prisma.idea.update({
      where: { id: ideaId },
      data: { status: "draft" }
    });

    try {
      const prompt = buildQuestionnairePrompt(idea.rawText);
      const response = await AiService.callLLM(prompt, true, QUESTIONNAIRE_SYSTEM_PROMPT, idea.userId);
      const parsed = AiService.robustJSONParse<any>(response);

      if (!parsed || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid questionnaire JSON response");
      }

      // Save to database (upsert to handle retries/re-generations)
      const questionnaire = await this.prisma.discoveryQuestionnaire.upsert({
        where: { ideaId },
        update: {
          questions: parsed.questions as any,
          generatedAt: new Date()
        },
        create: {
          ideaId,
          questions: parsed.questions as any
        }
      });

      // Update idea status
      const updatedIdea = await this.prisma.idea.update({
        where: { id: ideaId },
        data: { status: "questionnaire_ready" }
      });

      // Emit to socket room
      const socketService = SocketService.getInstance();
      socketService.emitToRoom(ideaId, "discovery:questionnaire_ready", { idea: updatedIdea, questionnaire });

      return questionnaire;
    } catch (error) {
      console.error("Error generating discovery questionnaire:", error);
      const socketService = SocketService.getInstance();
      socketService.emitToRoom(ideaId, "discovery:error", { message: "Failed to generate questionnaire." });
      throw error;
    }
  }

  static async getQuestionnaire(ideaId: string): Promise<any> {
    const questionnaire = await this.prisma.discoveryQuestionnaire.findUnique({
      where: { ideaId }
    });
    return questionnaire;
  }

  static async submitResponses(ideaId: string, responses: any[]): Promise<any> {
    const idea = await this.prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) throw new AppError(404, "Idea not found");

    // Save responses
    const responseRecord = await this.prisma.questionnaireResponse.upsert({
      where: { ideaId },
      update: { responses: responses as any, submittedAt: new Date() },
      create: { ideaId, responses: responses as any }
    });

    // Update status
    const updatedIdea = await this.prisma.idea.update({
      where: { id: ideaId },
      data: { status: "questionnaire_complete" }
    });

    // Emit to socket room
    const socketService = SocketService.getInstance();
    socketService.emitToRoom(ideaId, "discovery:submitted", { idea: updatedIdea, response: responseRecord });

    return responseRecord;
  }
}
