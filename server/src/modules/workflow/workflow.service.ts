import { NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { workflowRepository } from "./workflow.repository";
import AiService from "../ai/ai.service";
import AppError from "../../utils/app-error";
import { IWorkflow, IWorkflowStep, IUpdateWorkflowStepData, WorkflowStepStatus } from "./types/IWorkflow";
import IdeaRepository from "../idea/idea.repository";
import DocumentRepository from "../document/document.repository";
import DiagramRepository from "../diagram/diagram.repository";
import IRRepository from "../ir/ir.repository";
import { randomUUID } from "crypto";

export class WorkflowService {
    static async generateWorkflow(ideaId: string, next: NextFunction, onChunk?: (data: any) => void): Promise<IWorkflow | void> {
        // 1. Check if workflow already exists
        const existingWorkflow = await workflowRepository.getWorkflowByIdeaId(ideaId);
        if (existingWorkflow) {
            return next(new AppError(400, "Workflow already exists for this idea."));
        }

        // 2. Fetch Idea, Documents, Diagrams, and ProjectIR
        const ideaRepo = IdeaRepository.getInstance();
        const docRepo = DocumentRepository.getInstance();
        const diagRepo = DiagramRepository.getInstance();
        const irRepo = IRRepository.getInstance();

        const idea = await ideaRepo.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found."));
        }

        const documents = await docRepo.getDocumentsByIdeaId(ideaId);
        const diagrams = await diagRepo.getDiagramsByIdeaId(ideaId);
        const projectIR = await irRepo.getIRByIdeaId(ideaId);

        const ideaText = idea.businessDescription || idea.refinedText || idea.rawText;

        const context = {
            ideaText,
            documents: documents.map(d => ({ type: d.type, title: d.title, content: d.content })),
            diagrams: diagrams.map(d => ({ type: d.type, title: d.title, mermaidCode: d.mermaidCode })),
            projectIR: projectIR || undefined,
        };

        // Start generation
        if (onChunk) {
            await this.processWorkflowGeneration(ideaId, idea.userId, context, onChunk);
        } else {
            this.processWorkflowGeneration(ideaId, idea.userId, context);
        }

        return {} as IWorkflow;
    }

    private static async processWorkflowGeneration(
        ideaId: string,
        userId: string,
        context: {
            ideaText: string;
            documents: Array<{ type: string; title: string; content: string }>;
            diagrams: Array<{ type: string; title: string; mermaidCode: string }>;
            projectIR?: any;
        },
        onChunk?: (data: any) => void
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

            // Parse AI response to extract workflow steps
            const parsed = AiService.robustJSONParse<any>(fullResponse);
            const steps = parsed && Array.isArray(parsed.steps) ? parsed.steps : [];

            if (steps.length > 0) {
                // Save to Database
                const workflow = await workflowRepository.createWorkflow(ideaId);
                const stepIdMap = new Map<number, string>();

                steps.forEach((s: any, idx: number) => {
                    const id = randomUUID();
                    const order = s.order || idx + 1;
                    stepIdMap.set(order, id);
                });

                const sortedGeneratedSteps = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));
                const stepsData: Prisma.WorkflowStepCreateManyInput[] = sortedGeneratedSteps.map((s, index) => {
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

                await workflowRepository.createWorkflowSteps(workflow.id, stepsData);

                // Dependencies mapping
                const depsData: Prisma.WorkflowStepDependencyCreateManyInput[] = [];
                for (const s of sortedGeneratedSteps) {
                    const currentOrder = s.order;
                    const currentStepId = stepIdMap.get(currentOrder);
                    if (currentStepId && s.dependsOnStepOrders && Array.isArray(s.dependsOnStepOrders)) {
                        for (const depOrder of s.dependsOnStepOrders) {
                            const dependsOnStepId = stepIdMap.get(depOrder);
                            if (dependsOnStepId && dependsOnStepId !== currentStepId) {
                                depsData.push({ stepId: currentStepId, dependsOnStepId: dependsOnStepId });
                            }
                        }
                    }
                }

                if (depsData.length > 0) {
                    await workflowRepository.createStepDependencies(depsData);
                }

                const completeWorkflow = await workflowRepository.getWorkflowById(workflow.id);
                if (onChunk) {
                    onChunk({ status: "final", workflow: completeWorkflow });
                }
            } else {
                if (onChunk) {
                    onChunk({
                        status: "error",
                        message: "Failed to generate workflow steps. Please review upstream specifications.",
                    });
                }
            }
        } catch (error) {
            console.error("AI workflow generation error:", error);
            const errorMessage = error instanceof Error ? error.message : "Workflow generation failed";
            
            if (onChunk) {
                onChunk({ status: "error", message: errorMessage });
            }
        }
    }

    static async getWorkflowByIdeaId(ideaId: string, next: NextFunction): Promise<IWorkflow | void> {
        const workflow = await workflowRepository.getWorkflowByIdeaId(ideaId);
        if (!workflow) {
            return next(new AppError(404, "Workflow not found for this idea."));
        }
        return workflow as unknown as IWorkflow;
    }

    static async updateWorkflowStep(
        stepId: string,
        data: IUpdateWorkflowStepData,
        next: NextFunction
    ): Promise<IWorkflowStep | void> {
        const existingStep = await workflowRepository.getWorkflowStepById(stepId);
        if (!existingStep) {
            return next(new AppError(404, "Workflow step not found."));
        }

        // Business Rule: Cannot start "in_progress" if dependencies are not "completed"
        if (data.status === "in_progress") {
            const incompleteDeps = (existingStep.dependencies as any[]).filter(
                (d: any) => d.dependsOn.status !== "completed"
            );
            if (incompleteDeps.length > 0) {
                return next(new AppError(400, "Cannot start step. Dependencies must be completed first."));
            }
        }

        const updateData: Prisma.WorkflowStepUpdateInput = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.instructions !== undefined) updateData.instructions = data.instructions;
        if (data.status !== undefined) updateData.status = data.status;

        const updatedStep = await workflowRepository.updateWorkflowStep(stepId, updateData);

        // Create a version log if things changed substantially
        if (data.instructions !== undefined || data.status !== undefined) {
            const currentVersion = await workflowRepository.getLatestStepVersion(stepId);
            await workflowRepository.createWorkflowStepVersion({
                stepId,
                version: currentVersion + 1,
                title: updatedStep.title,
                description: updatedStep.description,
                instructions: updatedStep.instructions,
                status: updatedStep.status,
                changelog: data.changelog || "Manual update",
            });
        }

        return updatedStep as unknown as IWorkflowStep;
    }

    static async exportWorkflow(workflowId: string, next: NextFunction): Promise<string | void> {
        const steps = await workflowRepository.getWorkflowStepsByWorkflowId(workflowId);
        if (!steps || steps.length === 0) {
            return next(new AppError(404, "Workflow has no steps."));
        }

        let output = `# AI IDE Implementation Workflow\n\n`;
        output += `> This guide provides step-by-step instructions for implementing the requested features.\n\n`;

        steps.forEach((step: any) => {
            output += `## Step ${step.order}: ${step.title}\n`;
            output += `**Status:** ${step.status}\n\n`;
            output += `### Description\n${step.description}\n\n`;
            output += `### Implementation Instructions\n\`\`\`\n${step.instructions}\n\`\`\`\n\n`;

            if (step.dependencies && step.dependencies.length > 0) {
                const deps = step.dependencies.map((d: any) => d.dependsOn.title).join(", ");
                output += `*Depends on: ${deps}*\n\n`;
            }
            output += `---\n\n`;
        });

        return output;
    }
}
