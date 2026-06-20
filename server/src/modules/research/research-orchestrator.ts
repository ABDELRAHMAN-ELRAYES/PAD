import { spawn } from "child_process";
import path from "path";
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
      console.log(`Attaching to existing deep research job for idea ${ideaId}`);
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

    // Prepare search query by merging raw text and Q&A responses
    let questionnaireQAText = "";
    if (idea.questionnaireResponse && Array.isArray(idea.questionnaireResponse.responses)) {
      const responses = idea.questionnaireResponse.responses as any as IDiscoveryResponse[];
      questionnaireQAText = responses
        .map(r => `Q: ${r.label}\nA: ${Array.isArray(r.value) ? r.value.join(", ") : r.value}`)
        .join("\n\n");
    }

    const searchQuery = `Idea: ${idea.businessDescription || idea.rawText}\n\nAdditional Requirements:\n${questionnaireQAText}`;

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

    const rootDir = process.cwd().endsWith("server")
      ? path.join(process.cwd(), "..")
      : process.cwd();

    const pythonPath = path.join(rootDir, "local_deep_research/.venv/bin/python3");
    const bridgeScript = path.join(rootDir, "server/src/modules/research/deep_research_bridge.py");

    const env = {
      ...process.env,
      LDR_LLM_PROVIDER: process.env.LDR_LLM_PROVIDER || "ollama",
      LDR_LLM_MODEL: process.env.LDR_LLM_MODEL || "llama3.2:3b",
      LDR_LLM_OLLAMA_URL: process.env.LDR_LLM_OLLAMA_URL || "http://localhost:11434",
      LDR_LLM_OLLAMA_ENABLE_THINKING: "false",
      LDR_SEARCH_TOOL: process.env.LDR_SEARCH_TOOL || "wikipedia", // Fallback to wikipedia (keyless) if no search tool env is specified
      LDR_SEARCH_STRATEGY: "source_based",
      LDR_ITERATIONS: process.env.LDR_ITERATIONS || "2",
    };

    console.log(`Spawning Deep Research bridge process for idea ${ideaId}...`);

    const listeners = new Set<(event: any) => void>([onProgress]);

    const promise = new Promise<any>((resolve, reject) => {
      const pythonProcess = spawn(pythonPath, [bridgeScript, searchQuery], { env });

      let stdoutData = "";
      let stderrData = "";
      let finalData: any = null;

      pythonProcess.stdout.on("data", async (chunk) => {
        stdoutData += chunk.toString();
        const lines = stdoutData.split("\n");
        // Keep the last partial line in buffer
        stdoutData = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "progress") {
              // Scale python progress (usually 0-100) to 0-70 range
              const scaledProgress = Math.min(Math.round((parsed.progress / 100) * 70), 70);
              
              const progressEvent = {
                type: "progress",
                message: parsed.message,
                progress: scaledProgress,
                phase: parsed.metadata?.phase || "searching",
              };

              // Update progress in map
              const jobEntry = ResearchOrchestrator.activeJobs.get(ideaId);
              if (jobEntry) {
                jobEntry.currentProgress = progressEvent;
              }

              // Send update to all listeners
              listeners.forEach(cb => cb(progressEvent));

              // Update DB job progress
              await this.updateJobProgress(ideaId, scaledProgress, progressEvent.phase, parsed.message);

              // Emit socket event for real-time overview page updates
              SocketService.getInstance().emitToRoom(ideaId, "research:progress", progressEvent);
            } else if (parsed.type === "result") {
              finalData = parsed.data;
            }
          } catch (e) {
            // Log line that was not JSON (e.g. standard print or python warning)
            console.log(`[Python Bridge Log] ${line}`);
          }
        }
      });

      pythonProcess.stderr.on("data", (chunk) => {
        stderrData += chunk.toString();
        console.error(`[Python Bridge Error] ${chunk.toString().trim()}`);
      });

      pythonProcess.on("close", async (code) => {
        console.log(`Python deep research bridge exited with code ${code}`);
        ResearchOrchestrator.activeJobs.delete(ideaId);

        if (code !== 0 || !finalData) {
          const errorMsg = stderrData.trim() || "Deep research process failed to complete.";
          
          const job = await prisma.researchJob.findUnique({
            where: { ideaId },
            select: { logs: true }
          });
          const currentLogs = Array.isArray(job?.logs) ? (job.logs as any[]) : [];
          const updatedLogs = [
            ...currentLogs,
            { timestamp: new Date().toISOString(), message: `Error: ${errorMsg}` }
          ];

          await prisma.researchJob.update({
            where: { ideaId },
            data: {
              status: "failed",
              error: errorMsg,
              logs: updatedLogs,
            }
          });
          await prisma.idea.update({
            where: { id: ideaId },
            data: { status: "draft" }
          });
          
          const errorEvent = { type: "error", message: errorMsg };
          listeners.forEach(cb => cb(errorEvent));
          SocketService.getInstance().emitToRoom(ideaId, "research:error", errorEvent);
          
          return reject(new Error(errorMsg));
        }

        try {
          // Phase 2: Orchestrate synthesis of 7 blueprint sections
          const synthEvent = { type: "progress", message: "Structuring Research Blueprint...", progress: 75, phase: "synthesis" };
          listeners.forEach(cb => cb(synthEvent));
          
          await this.updateJobProgress(ideaId, 75, "synthesis", "Structuring Research Blueprint...");

          // Compile search findings into string context
          let searchFindingsContext = "No web search findings retrieved.";
          if (finalData.findings && finalData.findings.length > 0) {
            searchFindingsContext = finalData.findings
              .map((f: any) => `### Question: ${f.question}\nFindings: ${f.content}`)
              .join("\n\n");
          }

          // Build LLM prompts for structured synthesis
          const blueprintPrompt = `You are a lead systems architect and product strategist.
You are tasked with compiling a comprehensive, high-fidelity project blueprint based on a user's software idea, their answers to a discovery questionnaire, and deep research findings.

User Idea:
"""
${idea.businessDescription || idea.rawText}
"""

Discovery Q&A:
"""
${questionnaireQAText}
"""

Deep Research Findings:
"""
${searchFindingsContext}
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

          const response = await AiService.callLLM(blueprintPrompt, true, "You generate structured JSON project blueprints.", idea.userId);
          const blueprint = AiService.robustJSONParse<any>(response);

          if (!blueprint || !blueprint.understanding || !blueprint.suggestedScope) {
            throw new Error("Failed to generate valid 7-phase blueprint JSON structure.");
          }

          // Attach bibliography / sources to blueprint
          blueprint.sources = finalData.sources || [];

          // Save results to idea and update status
          const updatedIdea = await prisma.idea.update({
            where: { id: ideaId },
            data: {
              status: "research_complete",
              researchResult: blueprint as any,
              // Map legacy structure so old modules don't crash
              analysisResult: {
                missingDetails: [blueprint.understanding],
                complementarySuggestions: [blueprint.suggestedScope],
                constraintsAndRisks: [blueprint.risksAndConcerns],
                clarifyingQuestions: []
              } as any
            }
          });

          // Set job to complete
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

          listeners.forEach(cb => cb(completeEvent));
          SocketService.getInstance().emitToRoom(ideaId, "research:complete", completeEvent);

          resolve(blueprint);
        } catch (synthesisError: any) {
          console.error("Error during blueprint synthesis:", synthesisError);
          const job = await prisma.researchJob.findUnique({
            where: { ideaId },
            select: { logs: true }
          });
          const currentLogs = Array.isArray(job?.logs) ? (job.logs as any[]) : [];
          const updatedLogs = [
            ...currentLogs,
            { timestamp: new Date().toISOString(), message: `Error during synthesis: ${synthesisError.message}` }
          ];

          await prisma.researchJob.update({
            where: { ideaId },
            data: {
              status: "failed",
              error: synthesisError.message,
              logs: updatedLogs,
            }
          });
          
          const failEvent = { type: "error", message: synthesisError.message };
          listeners.forEach(cb => cb(failEvent));
          SocketService.getInstance().emitToRoom(ideaId, "research:error", failEvent);
          
          reject(synthesisError);
        }
      });
    });

    ResearchOrchestrator.activeJobs.set(ideaId, {
      listeners,
      currentProgress: { type: "progress", message: "Initializing Deep Research...", progress: 5, phase: "init" },
      promise
    });

    return promise;
  }
}
