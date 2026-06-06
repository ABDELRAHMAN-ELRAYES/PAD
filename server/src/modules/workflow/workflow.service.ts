import { NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { workflowRepository } from "./workflow.repository";
import FeatureRepository from "../feature/feature.repository";
import TaskRepository from "../task/task.repository";

const featureRepository = FeatureRepository.getInstance();
const taskRepository = TaskRepository.getInstance();
import AiService from "../ai/ai.service";
import AppError from "../../utils/app-error";
import { IWorkflow, IWorkflowStep, IUpdateWorkflowStepData, WorkflowStepStatus } from "./types/IWorkflow";
import { IFeature } from "../feature/types/IFeature";
import { ITask } from "../task/types/ITask";
import IdeaRepository from "../idea/idea.repository";

export class WorkflowService {
    static async generateWorkflow(ideaId: string, next: NextFunction, onChunk?: (data: any) => void): Promise<IWorkflow | void> {
        // 1. Check if workflow already exists
        const existingWorkflow = await workflowRepository.getWorkflowByIdeaId(ideaId);
        if (existingWorkflow) {
            return next(new AppError(400, "Workflow already exists for this idea."));
        }

        // 2. Fetch features and tasks
        const features = await featureRepository.getFeaturesByIdeaId(ideaId);
        if (!features || features.length === 0) {
            return next(new AppError(400, "No features found for this idea. Please run Module 4 first."));
        }

        // We need to fetch tasks and task dependencies to feed the AI
        const featuresWithTasks = await Promise.all(
            features.map(async (feature) => {
                const tasks = await taskRepository.getTasksByFeatureId(feature.id);
                return { ...feature, tasks } as IFeature & { tasks: ITask[] };
            })
        );

        // Fetch all task dependencies to help workflow generation
        const taskDependenciesMap: Record<string, string[]> = {};
        for (const feature of featuresWithTasks) {
            for (const task of feature.tasks) {
                const taskWithDeps = await taskRepository.getTaskWithDependencies(task.id);
                if (taskWithDeps && taskWithDeps.dependencies) {
                    taskDependenciesMap[task.id] = taskWithDeps.dependencies.map((d: any) => d.dependsOnTaskId);
                }
            }
        }

        // Start background generation
        if (onChunk) {
            // Perform generation and stream directly to callback (HTTP response)
            await this.processWorkflowGeneration(ideaId, featuresWithTasks, taskDependenciesMap, onChunk);
        } else {
            // Background generation (still used by some parts, but without sockets for now)
            this.processWorkflowGeneration(ideaId, featuresWithTasks, taskDependenciesMap);
        }

        return {} as IWorkflow;
    }

    private static async processWorkflowGeneration(
        ideaId: string,
        featuresWithTasks: (IFeature & { tasks: ITask[] })[],
        taskDependenciesMap: Record<string, string[]>,
        onChunk?: (data: any) => void
    ) {
        const ideaRepo = IdeaRepository.getInstance();
        const idea = await ideaRepo.getIdeaById(ideaId);
        const ideaText = idea?.refinedText || idea?.rawText || "Implement the features below.";
        
        let fullResponse = "";

        try {
            const stream = AiService.generateWorkflowStream(
                ideaText,
                featuresWithTasks,
                taskDependenciesMap
            );

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
                const { randomUUID } = require("crypto");
                const stepIdMap = new Map<number, string>();
                const stepTaskIdMap = new Map<string, string>();

                steps.forEach((s: any) => {
                    const id = randomUUID();
                    stepIdMap.set(s.order, id);
                    if (s.taskId) stepTaskIdMap.set(s.taskId, id);
                });

                const sortedGeneratedSteps = [...steps].sort((a, b) => a.order - b.order);
                const stepsData: Prisma.WorkflowStepCreateManyInput[] = sortedGeneratedSteps.map((s, index) => {
                    const stepId = stepIdMap.get(s.order)!;
                    return {
                        id: stepId,
                        workflowId: workflow.id,
                        taskId: s.taskId || null,
                        title: s.title,
                        description: s.description,
                        instructions: s.instructions,
                        order: index + 1,
                        status: "pending" as WorkflowStepStatus,
                    };
                });

                await workflowRepository.createWorkflowSteps(workflow.id, stepsData);

                // Dependencies...
                const depsData: Prisma.WorkflowStepDependencyCreateManyInput[] = [];
                for (const s of sortedGeneratedSteps) {
                    const currentStepId = stepIdMap.get(s.order)!;
                    if (s.dependsOnTaskIds && Array.isArray(s.dependsOnTaskIds)) {
                        for (const depTaskId of s.dependsOnTaskIds) {
                            const dependsOnStepId = stepTaskIdMap.get(depTaskId);
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

        // Create a version log if things changed substantially -> especially instructions
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

        // Auto-update parent Workflow status if needed
        // For simplicity, skip here, but could transition workflow to "active" or "completed"

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
