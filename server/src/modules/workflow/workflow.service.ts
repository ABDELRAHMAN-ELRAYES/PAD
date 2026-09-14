import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { WorkflowRepository } from "./workflow.repository";
import AiService from "../ai/ai.service";
import {
  IWorkflow,
  IWorkflowStep,
  IUpdateWorkflowStepData,
  WorkflowStepStatus,
} from "./types/IWorkflow";
import { IdeaRepository } from "../idea/idea.repository";
import { DocumentRepository } from "../document/document.repository";
import { DiagramRepository } from "../diagram/diagram.repository";
import { IRRepository } from "../ir/ir.repository";
import { randomUUID } from "crypto";

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private static instance: WorkflowService;

  constructor(
    private readonly workflowRepo: WorkflowRepository,
    private readonly ideaRepo: IdeaRepository,
    private readonly docRepo: DocumentRepository,
    private readonly diagRepo: DiagramRepository,
    private readonly irRepo: IRRepository,
  ) {
    WorkflowService.instance = this;
  }

  static getInstance(): WorkflowService {
    return WorkflowService.instance;
  }

  async generateWorkflow(
    ideaId: string,
    onChunk?: (data: any) => void,
  ): Promise<IWorkflow | void> {
    const existingWorkflow = await this.workflowRepo.getWorkflowByIdeaId(ideaId);
    if (existingWorkflow) {
      throw new BadRequestException("Workflow already exists for this idea.");
    }

    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found.");
    }

    const documents = await this.docRepo.getDocumentsByIdeaId(ideaId);
    const diagrams = await this.diagRepo.getDiagramsByIdeaId(ideaId);
    const projectIR = await this.irRepo.getIRByIdeaId(ideaId);

    const ideaText =
      idea.businessDescription || idea.refinedText || idea.rawText;

    const context = {
      ideaText,
      documents: documents.map((d) => ({
        type: d.type,
        title: d.title,
        content: d.content,
      })),
      diagrams: diagrams.map((d) => ({
        type: d.type,
        title: d.title,
        mermaidCode: d.mermaidCode,
      })),
      projectIR: projectIR || undefined,
    };

    if (onChunk) {
      await this.processWorkflowGeneration(
        ideaId,
        idea.userId,
        context,
        onChunk,
      );
    } else {
      this.processWorkflowGeneration(ideaId, idea.userId, context).catch(
        (err) => {
          this.logger.error("Background workflow generation error:", err);
        },
      );
    }

    return {} as IWorkflow;
  }

  private async processWorkflowGeneration(
    ideaId: string,
    userId: string,
    context: {
      ideaText: string;
      documents: Array<{ type: string; title: string; content: string }>;
      diagrams: Array<{ type: string; title: string; mermaidCode: string }>;
      projectIR?: any;
    },
    onChunk?: (data: any) => void,
  ) {
    let fullResponse = "";

    try {
      const stream = AiService.generateWorkflowStream(context, userId);

      for await (const chunk of stream) {
        fullResponse += chunk;
        const chunkData = {
          chunk,
          fullText: fullResponse,
        };
        if (onChunk) {
          onChunk(chunkData);
        }
      }

      const parsed = AiService.robustJSONParse<any>(fullResponse);
      const steps =
        parsed && Array.isArray(parsed.steps) ? parsed.steps : [];

      if (steps.length > 0) {
        const workflow = await this.workflowRepo.createWorkflow(ideaId);
        const stepIdMap = new Map<number, string>();

        steps.forEach((s: any, idx: number) => {
          const id = randomUUID();
          const order = s.order || idx + 1;
          stepIdMap.set(order, id);
        });

        const sortedGeneratedSteps = [...steps].sort(
          (a, b) => (a.order || 0) - (b.order || 0),
        );
        const stepsData = sortedGeneratedSteps.map((s, index) => {
          const order = s.order || index + 1;
          const stepId = stepIdMap.get(order) || randomUUID();
          return {
            id: stepId,
            workflowId: workflow.id,
            title: s.title,
            description: s.description,
            instructions: s.instructions,
            order: index + 1,
            status: "pending" as WorkflowStepStatus,
          };
        });

        await this.workflowRepo.createWorkflowSteps(workflow.id, stepsData);

        const depsData: Array<{ stepId: string; dependsOnStepId: string }> =
          [];
        for (const s of sortedGeneratedSteps) {
          const currentOrder = s.order;
          const currentStepId = stepIdMap.get(currentOrder);
          if (
            currentStepId &&
            s.dependsOnStepOrders &&
            Array.isArray(s.dependsOnStepOrders)
          ) {
            for (const depOrder of s.dependsOnStepOrders) {
              const dependsOnStepId = stepIdMap.get(depOrder);
              if (
                dependsOnStepId &&
                dependsOnStepId !== currentStepId
              ) {
                depsData.push({
                  stepId: currentStepId,
                  dependsOnStepId,
                });
              }
            }
          }
        }

        if (depsData.length > 0) {
          await this.workflowRepo.createStepDependencies(depsData);
        }

        const completeWorkflow =
          await this.workflowRepo.getWorkflowById(workflow.id);
        if (onChunk) {
          onChunk({ status: "final", workflow: completeWorkflow });
        }
      } else {
        if (onChunk) {
          onChunk({
            status: "error",
            message:
              "Failed to generate workflow steps. Please review upstream specifications.",
          });
        }
      }
    } catch (error) {
      this.logger.error("AI workflow generation error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Workflow generation failed";

      if (onChunk) {
        onChunk({ status: "error", message: errorMessage });
      }
    }
  }

  async getWorkflowByIdeaId(ideaId: string): Promise<IWorkflow> {
    const workflow = await this.workflowRepo.getWorkflowByIdeaId(ideaId);
    if (!workflow) {
      throw new NotFoundException("Workflow not found for this idea.");
    }
    return workflow;
  }

  async updateWorkflowStep(
    stepId: string,
    data: IUpdateWorkflowStepData,
  ): Promise<IWorkflowStep> {
    const existingStep = await this.workflowRepo.getWorkflowStepById(stepId);
    if (!existingStep) {
      throw new NotFoundException("Workflow step not found.");
    }

    if (data.status === "in_progress") {
      const incompleteDeps = (existingStep.dependencies as any[]).filter(
        (d: any) => d.dependsOn && d.dependsOn.status !== "completed",
      );
      if (incompleteDeps.length > 0) {
        throw new BadRequestException(
          "Cannot start step. Dependencies must be completed first.",
        );
      }
    }

    const updatedStep = await this.workflowRepo.updateWorkflowStep(stepId, {
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      status: data.status,
    });

    if (data.instructions !== undefined || data.status !== undefined) {
      const currentVersion =
        await this.workflowRepo.getLatestStepVersion(stepId);
      await this.workflowRepo.createWorkflowStepVersion({
        stepId,
        version: currentVersion + 1,
        title: updatedStep.title,
        description: updatedStep.description,
        instructions: updatedStep.instructions,
        status: updatedStep.status,
        changelog: data.changelog || "Manual update",
      });
    }

    return updatedStep;
  }

  async exportWorkflow(workflowId: string): Promise<string> {
    const steps =
      await this.workflowRepo.getWorkflowStepsByWorkflowId(workflowId);
    if (!steps || steps.length === 0) {
      throw new NotFoundException("Workflow has no steps.");
    }

    let output = `# AI IDE Implementation Workflow\n\n`;
    output += `> This guide provides step-by-step instructions for implementing the requested features.\n\n`;

    steps.forEach((step: any) => {
      output += `## Step ${step.order}: ${step.title}\n`;
      output += `**Status:** ${step.status}\n\n`;
      output += `### Description\n${step.description}\n\n`;
      output += `### Implementation Instructions\n\`\`\`\n${step.instructions}\n\`\`\`\n\n`;

      if (step.dependencies && step.dependencies.length > 0) {
        const deps = step.dependencies
          .map((d: any) => d.dependsOn?.title || d.dependsOnStepId)
          .join(", ");
        output += `*Depends on: ${deps}*\n\n`;
      }
      output += `---\n\n`;
    });

    return output;
  }
}

export default WorkflowService;
