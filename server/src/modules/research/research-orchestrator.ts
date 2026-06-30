import PrismaClientSingleton from "../../data-server-clients/prisma-client";
import AiService from "../ai/ai.service";
import SocketService from "../../services/socket.service";

const prisma = PrismaClientSingleton.getPrismaClient();

export interface IDiscoveryResponse {
  questionId: string;
  label: string;
  value: any;
}

export default class ResearchOrchestrator {
  private static activeJobs = new Map<string, {
    listeners: Set<(event: any) => void>;
    currentProgress: any;
    promise: Promise<any>;
  }>();

  private static async updateJobProgress(
    ideaId: string,
    progress: number,
    phase: string,
    message: string
  ): Promise<void> {
    try {
      const job = await prisma.researchJob.findUnique({
        where: { ideaId },
        select: { logs: true }
      });
      const currentLogs = Array.isArray(job?.logs) ? (job.logs as any[]) : [];
      const updatedLogs = [
        ...currentLogs,
        { timestamp: new Date().toISOString(), message }
      ];

      await prisma.researchJob.update({
        where: { ideaId },
        data: {
          progress,
          currentPhase: phase,
          logs: updatedLogs
        }
      });
    } catch (err) {
      console.error(`Failed to update job progress in DB for ${ideaId}:`, err);
    }
  }

  static removeListener(ideaId: string, listener: (event: any) => void) {
    const job = this.activeJobs.get(ideaId);
    if (job) {
      job.listeners.delete(listener);
      console.log(`Removed SSE listener for idea ${ideaId}. Remaining listeners: ${job.listeners.size}`);
    }
  }

  static async runResearch(ideaId: string, onProgress: (event: any) => void): Promise<any> {
    // 1. Check if job is already active and running
    const activeJob = this.activeJobs.get(ideaId);
    if (activeJob) {
      console.log(`Attaching to existing research job for idea ${ideaId}`);
      activeJob.listeners.add(onProgress);
      if (activeJob.currentProgress) {
        onProgress(activeJob.currentProgress);
      }
      return activeJob.promise;
    }

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      include: {
        discoveryQuestionnaire: true,
        questionnaireResponse: true,
      }
    });

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Prepare Q&A context from questionnaire responses
    let questionnaireQAText = "";
    if (idea.questionnaireResponse && Array.isArray(idea.questionnaireResponse.responses)) {
      const responses = idea.questionnaireResponse.responses as any as IDiscoveryResponse[];
      questionnaireQAText = responses
        .map(r => `Q: ${r.label}\nA: ${Array.isArray(r.value) ? r.value.join(", ") : r.value}`)
        .join("\n\n");
    }

    // Initialize/Reset Research Job status
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "researching" }
    });

    await prisma.researchJob.upsert({
      where: { ideaId },
      update: {
        status: "running",
        currentPhase: "init",
        progress: 5,
        logs: [] as any,
        error: null,
      },
      create: {
        ideaId,
        status: "running",
        currentPhase: "init",
        progress: 5,
        logs: [] as any,
      }
    });

    const listeners = new Set<(event: any) => void>([onProgress]);

    const emit = (event: any) => {
      const jobEntry = ResearchOrchestrator.activeJobs.get(ideaId);
      if (jobEntry) jobEntry.currentProgress = event;
      listeners.forEach(cb => cb(event));
    };

    const promise = (async () => {
      try {
        // Phase: init
        const initEvent = { type: "progress", message: "Initializing AI Research Agent...", progress: 5, phase: "init" };
        emit(initEvent);
        await this.updateJobProgress(ideaId, 5, "init", "Initializing AI Research Agent...");
        SocketService.getInstance().emitToRoom(ideaId, "research:progress", initEvent);

        // Phase: understanding
        const understandingEvent = { type: "progress", message: "Analyzing Requirements & Problem Statement...", progress: 20, phase: "understanding" };
        emit(understandingEvent);
        await this.updateJobProgress(ideaId, 20, "understanding", "Analyzing Requirements & Problem Statement...");
        SocketService.getInstance().emitToRoom(ideaId, "research:progress", understandingEvent);

        // Phase: synthesis — single LLM call generating the full blueprint
        const synthEvent = { type: "progress", message: "Structuring Research Blueprint...", progress: 50, phase: "synthesis" };
        emit(synthEvent);
        await this.updateJobProgress(ideaId, 50, "synthesis", "Structuring Research Blueprint...");
        SocketService.getInstance().emitToRoom(ideaId, "research:progress", synthEvent);

        const blueprintPrompt = `You are a lead systems architect and product strategist.
You are tasked with compiling a comprehensive, high-fidelity project blueprint based on a user's software idea and their answers to a discovery questionnaire.

User Idea:
"""
${idea.businessDescription || idea.rawText}
"""

Discovery Q&A:
"""
${questionnaireQAText || "No questionnaire responses provided."}
"""

Based on this information, generate a structured project blueprint containing the following 7 sections. Return the result STRICTLY as a JSON object matching this schema:
{
  "understanding": "Detailed synthesis of the core value proposition, target audience, and primary problem solved.",
  "competitors": "Analysis of existing competitors or alternative solutions, their strengths and weaknesses, and how this solution differentiates.",
  "marketAnalysis": "Target market size, growth trends, user persona profiles, and monetisation/launch suggestions.",
  "architecture": "Recommended technical architecture, frontend/backend stack, database model, hosting, key integrations, and scalability strategy.",
  "suggestedScope": "Feature backlog and milestones. Clearly defined MVP features and proposed Phase 2 features.",
  "risksAndConcerns": "Technical, market, operational, or legal risks, and proposed mitigation strategies.",
  "synthesisSummary": "Executive summary of the blueprint, providing a clear pitch and final assessment."
}

Use markdown formatting (like bullet points, bold text, etc.) INSIDE the string values of each section to make the output look premium, professional, and well-structured when rendered. Do not return any other text besides the JSON.`;

        const finalizingEvent = { type: "progress", message: "Finalizing blueprint sections...", progress: 75, phase: "synthesis" };
        emit(finalizingEvent);
        await this.updateJobProgress(ideaId, 75, "synthesis", "Finalizing blueprint sections...");
        SocketService.getInstance().emitToRoom(ideaId, "research:progress", finalizingEvent);

        const response = await AiService.callLLM(blueprintPrompt, true, "You generate structured JSON project blueprints.", idea.userId);
        const blueprint = AiService.robustJSONParse<any>(response);

        if (!blueprint || !blueprint.understanding || !blueprint.suggestedScope) {
          throw new Error("Failed to generate valid 7-phase blueprint JSON structure.");
        }

        blueprint.sources = [];

        // Save results to idea and update status
        const updatedIdea = await prisma.idea.update({
          where: { id: ideaId },
          data: {
            status: "research_complete",
            researchResult: blueprint as any,
            analysisResult: {
              missingDetails: [blueprint.understanding],
              complementarySuggestions: [blueprint.suggestedScope],
              constraintsAndRisks: [blueprint.risksAndConcerns],
              clarifyingQuestions: []
            } as any
          }
        });

        // Update job to complete
        const job = await prisma.researchJob.findUnique({
          where: { ideaId },
          select: { logs: true }
        });
        const currentLogs = Array.isArray(job?.logs) ? (job.logs as any[]) : [];
        const updatedLogs = [
          ...currentLogs,
          { timestamp: new Date().toISOString(), message: "Research completed successfully!" }
        ];

        await prisma.researchJob.update({
          where: { ideaId },
          data: {
            status: "completed",
            progress: 100,
            currentPhase: "complete",
            logs: updatedLogs,
          }
        });

        const completeEvent = {
          type: "complete",
          message: "Research completed successfully!",
          progress: 100,
          data: blueprint,
          idea: updatedIdea
        };

        emit(completeEvent);
        SocketService.getInstance().emitToRoom(ideaId, "research:complete", completeEvent);

        ResearchOrchestrator.activeJobs.delete(ideaId);
        return blueprint;

      } catch (err: any) {
        console.error(`Research failed for idea ${ideaId}:`, err);

        const job = await prisma.researchJob.findUnique({
          where: { ideaId },
          select: { logs: true }
        });
        const currentLogs = Array.isArray(job?.logs) ? (job.logs as any[]) : [];
        const updatedLogs = [
          ...currentLogs,
          { timestamp: new Date().toISOString(), message: `Error: ${err.message}` }
        ];

        await prisma.researchJob.update({
          where: { ideaId },
          data: {
            status: "failed",
            error: err.message,
            logs: updatedLogs,
          }
        });

        await prisma.idea.update({
          where: { id: ideaId },
          data: { status: "draft" }
        });

        const errorEvent = { type: "error", message: err.message };
        emit(errorEvent);
        SocketService.getInstance().emitToRoom(ideaId, "research:error", errorEvent);

        ResearchOrchestrator.activeJobs.delete(ideaId);
        throw err;
      }
    })();

    ResearchOrchestrator.activeJobs.set(ideaId, {
      listeners,
      currentProgress: { type: "progress", message: "Initializing AI Research Agent...", progress: 5, phase: "init" },
      promise
    });

    return promise;
  }
}
