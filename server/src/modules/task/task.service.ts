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
import PrismaClientSingleton from "../../data-server-clients/prisma-client";

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
            return;
        }

        const prisma = PrismaClientSingleton.getPrismaClient();

        // 1. Gather all documents for the idea to build rich techSpec
        const documents = await prisma.document.findMany({
            where: { ideaId: feature.ideaId }
        });
        const techSpec = documents
            .map((doc) => `### DOCUMENT: ${doc.type} - ${doc.title}\n\n${doc.content}`)
            .join("\n\n---\n\n");

        // 2. Gather all diagrams for database schemas & architecture
        const diagrams = await prisma.diagram.findMany({
            where: { ideaId: feature.ideaId }
        });
        const dbSchema = diagrams
            .map((diag) => `### DIAGRAM: ${diag.type} - ${diag.title}\n\n${diag.mermaidCode}`)
            .join("\n\n---\n\n");

        // 3. Gather Project IR
        const projectIR = await prisma.projectIR.findUnique({
            where: { ideaId: feature.ideaId }
        });
        const irText = projectIR ? JSON.stringify(projectIR.schemaData, null, 2) : "";

        // 4. Build prompt using all artifacts
        const prompt = buildGenerateTasksPrompt(feature, techSpec, dbSchema, irText);

        try {
            const aiResponse = await AIService.callLLM(prompt);
            const tasksData = this.parseAITasksResponse(aiResponse);

            // Clean existing tasks for this feature to avoid duplications
            await this.repository.deleteTasksByFeatureId(featureId);

            const createdTasks: ITask[] = [];
            const tasksWithDeps: Array<{ task: ITask; depIndices: number[] }> = [];

            for (let i = 0; i < tasksData.length; i++) {
                const taskData = tasksData[i];
                const repositoryData: ICreateTaskRepositoryData = {
                    featureId,
                    title: taskData.title,
                    description: taskData.description,
                    priority: (taskData.priority || "medium") as Priority,
                    estimatedEffort: taskData.estimatedEffort || "1d",
                    order: i,
                    status: "planned",
                };

                const task = await this.repository.createTask(repositoryData);
                createdTasks.push(task);

                if (Array.isArray(taskData.dependencies)) {
                    tasksWithDeps.push({
                        task,
                        depIndices: taskData.dependencies
                    });
                }
            }

            // Create task dependencies based on AI returned indices
            for (const item of tasksWithDeps) {
                for (const depIndex of item.depIndices) {
                    if (depIndex >= 0 && depIndex < createdTasks.length && depIndex !== createdTasks.indexOf(item.task)) {
                        const dependencyTask = createdTasks[depIndex];
                        await this.repository.addDependency(item.task.id, dependencyTask.id);
                    }
                }
            }

            return createdTasks;
        } catch (error) {
            console.error("AI task suggestion error:", error);
            next(new AppError(500, "Failed to suggest tasks using AI"));
            return;
        }
    }

    private static parseAITasksResponse(response: string): Array<{ title: string; description: string; priority?: string; estimatedEffort?: string; dependencies?: number[] }> {
        console.log("parseAITasksResponse received raw response:", response);
        try {
            let tasks: any = null;
            try {
                tasks = AIService.robustJSONParse<any>(response);
            } catch (_) {}

            if (!tasks) {
                try {
                    const jsonMatch = response.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        tasks = JSON.parse(jsonMatch[0]);
                    }
                } catch (_) {}
            }

            if (!tasks) {
                try {
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        tasks = JSON.parse(jsonMatch[0]);
                    }
                } catch (_) {}
            }

            // Extract tasks array if tasks was parsed as an object containing an array field
            if (tasks && !Array.isArray(tasks) && typeof tasks === "object") {
                const arrayKey = Object.keys(tasks).find(key => Array.isArray(tasks[key]));
                if (arrayKey) {
                    tasks = tasks[arrayKey];
                }
            }

            if (tasks && Array.isArray(tasks)) {
                return tasks.map((t: any) => {
                    if (typeof t === "string") {
                        const splitIndex = t.indexOf(":") !== -1 ? t.indexOf(":") : t.indexOf("-");
                        let title = t;
                        let description = "No description provided";
                        if (splitIndex !== -1) {
                            title = t.substring(0, splitIndex).trim();
                            description = t.substring(splitIndex + 1).trim();
                        }
                        return {
                            title: title || "Untitled Task",
                            description: description || "No description provided",
                            priority: "medium",
                            estimatedEffort: "1d",
                            dependencies: []
                        };
                    }

                    if (!t || typeof t !== "object") {
                        return {
                            title: "Untitled Task",
                            description: "No description provided",
                            priority: "medium",
                            estimatedEffort: "1d",
                            dependencies: []
                        };
                    }

                    // Extract values case-insensitively or via common task property names
                    let title = "";
                    let description = "";
                    let priority = "medium";
                    let estimatedEffort = "1d";
                    let dependencies: number[] = [];

                    // Aggressively normalize keys by stripping spaces, hyphens, and underscores
                    const normalizedKeysObj: Record<string, string> = {};
                    for (const k of Object.keys(t)) {
                        normalizedKeysObj[k.toLowerCase().replace(/[\s\-_]/g, "")] = k;
                    }

                    // Look for title
                    const titleKeys = ["title", "name", "task", "tasktitle", "taskname", "header", "summary"];
                    for (const tk of titleKeys) {
                        if (normalizedKeysObj[tk]) {
                            title = String(t[normalizedKeysObj[tk]]);
                            break;
                        }
                    }

                    // Look for description
                    const descKeys = ["description", "desc", "details", "body", "taskdescription", "text"];
                    for (const dk of descKeys) {
                        if (normalizedKeysObj[dk]) {
                            description = String(t[normalizedKeysObj[dk]]);
                            break;
                        }
                    }

                    // Look for priority
                    const priorityKeys = ["priority", "taskpriority", "importance"];
                    for (const pk of priorityKeys) {
                        if (normalizedKeysObj[pk]) {
                            priority = String(t[normalizedKeysObj[pk]]);
                            break;
                        }
                    }

                    // Look for estimatedEffort
                    const effortKeys = ["estimatedeffort", "effort", "duration", "time", "hours", "days"];
                    for (const ek of effortKeys) {
                        if (normalizedKeysObj[ek]) {
                            estimatedEffort = String(t[normalizedKeysObj[ek]]);
                            break;
                        }
                    }

                    // Look for dependencies
                    const depKeys = ["dependencies", "dependson", "dep", "deps", "predecessors"];
                    for (const dk of depKeys) {
                        if (normalizedKeysObj[dk]) {
                            const val = t[normalizedKeysObj[dk]];
                            if (Array.isArray(val)) {
                                dependencies = val.map(Number);
                            }
                            break;
                        }
                    }

                    return {
                        title: title || "Untitled Task",
                        description: description || "No description provided",
                        priority: priority || "medium",
                        estimatedEffort: estimatedEffort || "1d",
                        dependencies
                    };
                });
            }

            // Fallback: Try parsing markdown list lines (e.g. lines starting with - or * or numbers)
            const listLines = response
                .split("\n")
                .map(line => line.trim())
                .filter(line => line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line));

            if (listLines.length > 0) {
                return listLines.map((line) => {
                    const cleanLine = line.replace(/^[-*\d.]+\s*/, "").trim();
                    const splitIndex = cleanLine.indexOf(":") !== -1 ? cleanLine.indexOf(":") : cleanLine.indexOf("-");
                    let title = cleanLine;
                    let description = "No description provided";
                    if (splitIndex !== -1) {
                        title = cleanLine.substring(0, splitIndex).trim();
                        description = cleanLine.substring(splitIndex + 1).trim();
                    }
                    return {
                        title: title || "Untitled Task",
                        description: description || "No description provided",
                        priority: "medium",
                        estimatedEffort: "1d",
                        dependencies: []
                    };
                });
            }

            throw new Error("Parsed result was not a JSON array/object and contained no markdown list items");
        } catch (error) {
            console.error("Failed to parse tasks response:", error);
            return [{
                title: "AI-Generated Task",
                description: response.substring(0, 500),
                priority: "medium",
                estimatedEffort: "1d",
                dependencies: []
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
            return;
        }

        const repositoryData: ICreateTaskRepositoryData = {
            featureId,
            title: data.title.trim(),
            description: data.description.trim(),
            priority: data.priority || "medium",
            estimatedEffort: data.estimatedEffort || "1d",
            order: data.order || 0,
            status: "planned",
        };

        return await this.repository.createTask(repositoryData);
    }

    static async getTask(id: string, next: NextFunction): Promise<ITask | undefined> {
        const task = await this.repository.getTaskById(id);
        if (!task) {
            next(new AppError(404, "Task not found"));
            return;
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
            return;
        }
        return task;
    }

    static async updateTask(id: string, data: IUpdateTaskData, next: NextFunction): Promise<ITask | undefined> {
        const existingTask = await this.repository.getTaskById(id);
        if (!existingTask) {
            next(new AppError(404, "Task not found"));
            return;
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
            return;
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
            return;
        }
        return await this.repository.getVersionHistory(id);
    }
}
