import { NextFunction } from "express";
import TaskRepository from "./task.repository";
import AppError from "../../utils/app-error";
import {
    ICreateTaskData,
    IUpdateTaskData,
    ITask,
    ITaskVersion,
    ITaskWithDependencies,
    ICreateTaskRepositoryData,
    TaskStatus,
    Priority,
} from "./types/ITask";
import AIService from "../ai/ai.service";
import { buildGenerateTasksPrompt } from "../ai/prompts/feature-task.prompt";
import FeatureRepository from "../feature/feature.repository";

export default class TaskService {
    private static repository = TaskRepository.getInstance();

    // Suggest tasks for a feature using AI
    static async suggestTasksForFeature(
        featureId: string,
        next: NextFunction
    ): Promise<ITask[] | undefined> {
        const featureRepo = FeatureRepository.getInstance();
        const feature = await featureRepo.getFeatureById(featureId);

        if (!feature) {
            next(new AppError(404, "Feature not found"));
            return
        }

        const prompt = buildGenerateTasksPrompt(feature.title, feature.description);

        try {
            const aiResponse = await AIService.callLLM(prompt);
            const tasksData = this.parseAITasksResponse(aiResponse);

            const createdTasks: ITask[] = [];
            for (let i = 0; i < tasksData.length; i++) {
                const taskData = tasksData[i];
                const repositoryData: ICreateTaskRepositoryData = {
                    featureId,
                    title: taskData.title,
                    description: taskData.description,
                    priority: (taskData.priority || "medium") as Priority,
                    estimatedEffort: taskData.estimatedEffort,
                    order: i,
                    status: "planned",
                };

                const task = await this.repository.createTask(repositoryData);
                createdTasks.push(task);
            }

            return createdTasks;
        } catch (error) {
            next(new AppError(500, "Failed to suggest tasks using AI"));
            return
        }
    }

    private static parseAITasksResponse(response: string): Array<{ title: string; description: string; priority?: string; estimatedEffort?: string }> {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }

            const tasks = JSON.parse(jsonMatch[0]);
            return tasks.map((t: any) => ({
                title: t.title || "Untitled Task",
                description: t.description || "No description provided",
                priority: t.priority,
                estimatedEffort: t.estimatedEffort,
            }));
        } catch (error) {
            return [{
                title: "AI-Generated Task",
                description: response.substring(0, 500),
            }];
        }
    }

    static async createTask(
        featureId: string,
        data: ICreateTaskData,
        next: NextFunction
    ): Promise<ITask | undefined> {
        if (!data.title || data.title.trim().length < 3) {
            next(new AppError(400, "Task title must be at least 3 characters"));
            return

        }

        const repositoryData: ICreateTaskRepositoryData = {
            featureId,
            title: data.title.trim(),
            description: data.description.trim(),
            priority: data.priority || "medium",
            estimatedEffort: data.estimatedEffort,
            order: data.order || 0,
            status: "planned",
        };

        return await this.repository.createTask(repositoryData);
    }

    static async getTask(id: string, next: NextFunction): Promise<ITask | undefined> {
        const task = await this.repository.getTaskById(id);
        if (!task) {
            next(new AppError(404, "Task not found"));
            return
        }
        return task;
    }

    static async getTasksByFeature(featureId: string): Promise<ITask[]> {
        return await this.repository.getTasksByFeatureId(featureId);
    }

    static async getTaskWithDependencies(id: string, next: NextFunction): Promise<ITaskWithDependencies | undefined> {
        const task = await this.repository.getTaskWithDependencies(id);
        if (!task) {
            next(new AppError(404, "Task not found"));
            return

        }
        return task;
    }

    static async updateTask(id: string, data: IUpdateTaskData, next: NextFunction): Promise<ITask | undefined> {
        const existingTask = await this.repository.getTaskById(id);
        if (!existingTask) {
            next(new AppError(404, "Task not found"));
            return
        }

        if (data.title || data.description || data.status) {
            await this.repository.createVersion(
                id,
                data.title || existingTask.title,
                data.description || existingTask.description,
                data.status || existingTask.status,
                data.changelog || null
            );
        }

        return await this.repository.updateTask(id, data);
    }

    static async updateTaskStatus(id: string, status: TaskStatus, next: NextFunction): Promise<ITask | undefined> {
        const existingTask = await this.repository.getTaskById(id);
        if (!existingTask) {
            next(new AppError(404, "Task not found"));
            return
        }

        await this.repository.createVersion(
            id,
            existingTask.title,
            existingTask.description,
            status,
            `Status changed to ${status}`
        );

        return await this.repository.updateTask(id, { status });
    }

    static async deleteTask(id: string, next: NextFunction): Promise<void> {
        const existingTask = await this.repository.getTaskById(id);
        if (!existingTask) {
            return next(new AppError(404, "Task not found"));
        }
        await this.repository.deleteTask(id);
    }

    static async addDependency(taskId: string, dependsOnTaskId: string, next: NextFunction): Promise<void> {
        if (taskId === dependsOnTaskId) {
            return next(new AppError(400, "A task cannot depend on itself"));
        }

        const task = await this.repository.getTaskById(taskId);
        const dependsOnTask = await this.repository.getTaskById(dependsOnTaskId);

        if (!task || !dependsOnTask) {
            return next(new AppError(404, "One or both tasks not found"));
        }

        const hasCircular = await this.repository.hasCircularDependency(taskId, dependsOnTaskId);
        if (hasCircular) {
            return next(new AppError(400, "Adding this dependency would create a circular dependency"));
        }

        await this.repository.addDependency(taskId, dependsOnTaskId);
    }

    static async removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
        await this.repository.removeDependency(taskId, dependsOnTaskId);
    }

    static async getVersionHistory(id: string, next: NextFunction): Promise<ITaskVersion[] | undefined> {
        const existingTask = await this.repository.getTaskById(id);
        if (!existingTask) {
            next(new AppError(404, "Task not found"));
            return
        }
        return await this.repository.getVersionHistory(id);
    }
}
