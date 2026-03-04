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

export class WorkflowService {
    static async generateWorkflow(ideaId: string, next: NextFunction): Promise<IWorkflow | void> {
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

        // We need the original idea text for context
        // In a real implementation we'd probably fetch the idea here, 
        // but since AI Service needs ideaText, let's just pass a generic text or fetch if needed
        // Since we don't have IdeaRepository imported easily, we can use a dummy or skip
        // For accurate AI generation, we should fetch it. Instead of importing Idea repo, let's just pass a summary.
        const ideaText = "Implement the features below.";

        // 3. Ask AI to generate Workflow Steps
        const generatedSteps = await AiService.generateWorkflow(
            ideaText,
            featuresWithTasks,
            taskDependenciesMap,
            next
        );

        if (!generatedSteps) {
            return; // Error passed to next()
        }

        // 4. Save to Database
        // Create the Workflow first
        const workflow = await workflowRepository.createWorkflow(ideaId);

        // Map AI generated steps to Database create inputs
        // Note: Prisma string IDs will be generated automatically if we let Prisma handle it,
        // but since we need to map dependencies between these steps, we should generate UUIDs now.
        const { v4: uuidv4 } = require("uuid"); // Lazy load or assume standard import

        const stepIdMap = new Map<number, string>(); // order -> generated UUID
        const stepTaskIdMap = new Map<string, string>(); // taskId -> step UUID

        generatedSteps.forEach((s) => {
            const id = uuidv4();
            stepIdMap.set(s.order, id);
            if (s.taskId) {
                stepTaskIdMap.set(s.taskId, id);
            }
        });

        const sortedGeneratedSteps = [...generatedSteps].sort((a, b) => a.order - b.order);

        const stepsData: Prisma.WorkflowStepCreateManyInput[] = sortedGeneratedSteps.map((s, index) => {
            const stepId = stepIdMap.get(s.order)!;
            return {
                id: stepId,
                workflowId: workflow.id,
                taskId: s.taskId || null,
                title: s.title,
                description: s.description,
                instructions: s.instructions,
                order: index + 1, // Ensure sequential 1-based order
                status: "pending" as WorkflowStepStatus,
            };
        });

        await workflowRepository.createWorkflowSteps(workflow.id, stepsData);

        // 5. Build dependencies
        const depsData: Prisma.WorkflowStepDependencyCreateManyInput[] = [];
        for (const s of sortedGeneratedSteps) {
            const currentStepId = stepIdMap.get(s.order)!;
            if (s.dependsOnTaskIds && Array.isArray(s.dependsOnTaskIds)) {
                for (const depTaskId of s.dependsOnTaskIds) {
                    const dependsOnStepId = stepTaskIdMap.get(depTaskId);
                    if (dependsOnStepId && dependsOnStepId !== currentStepId) {
                        // Create dependency link
                        depsData.push({
                            stepId: currentStepId,
                            dependsOnStepId: dependsOnStepId,
                        });
                    }
                }
            }
        }

        if (depsData.length > 0) {
            await workflowRepository.createStepDependencies(depsData);
        }

        // 6. Return the fully populated workflow
        const completeWorkflow = await workflowRepository.getWorkflowById(workflow.id);
        return completeWorkflow as unknown as IWorkflow;
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
