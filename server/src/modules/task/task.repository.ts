import { PrismaClient } from "@prisma/client";
import AppError from "../../utils/app-error";
import {
    ICreateTaskRepositoryData,
    IUpdateTaskRepositoryData,
    ITask,
    ITaskVersion,
    ITaskWithDependencies,
} from "./types/ITask";

export default class TaskRepository {
    private static instance: TaskRepository;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): TaskRepository {
        if (!TaskRepository.instance) {
            TaskRepository.instance = new TaskRepository();
        }
        return TaskRepository.instance;
    }

    // Create a new task
    async createTask(data: ICreateTaskRepositoryData): Promise<ITask> {
        try {
            return await this.prisma.task.create({
                data: {
                    featureId: data.featureId,
                    title: data.title,
                    description: data.description,
                    priority: data.priority,
                    status: data.status,
                    estimatedEffort: data.estimatedEffort,
                    order: data.order,
                },
            }) as ITask;
        } catch (error) {
            throw new AppError(500, "Failed to create task");
        }
    }

    // Get a task by ID
    async getTaskById(id: string): Promise<ITask | null> {
        try {
            return await this.prisma.task.findUnique({
                where: { id },
            }) as ITask | null;
        } catch (error) {
            throw new AppError(500, "Failed to fetch task");
        }
    }

    // Get all tasks for a feature
    async getTasksByFeatureId(featureId: string): Promise<ITask[]> {
        try {
            return await this.prisma.task.findMany({
                where: { featureId },
                orderBy: { order: "asc" },
            }) as ITask[];
        } catch (error) {
            throw new AppError(500, "Failed to fetch tasks");
        }
    }

    // Get task with dependencies
    async getTaskWithDependencies(id: string): Promise<ITaskWithDependencies | null> {
        try {
            const task = await this.prisma.task.findUnique({
                where: { id },
                include: {
                    dependencies: {
                        include: {
                            dependsOn: true,
                        },
                    },
                    dependents: {
                        include: {
                            task: true,
                        },
                    },
                },
            });

            return task as unknown as ITaskWithDependencies | null;
        } catch (error) {
            throw new AppError(500, "Failed to fetch task with dependencies");
        }
    }

    // Update a task
    async updateTask(id: string, data: IUpdateTaskRepositoryData): Promise<ITask> {
        try {
            return await this.prisma.task.update({
                where: { id },
                data,
            }) as ITask;
        } catch (error) {
            throw new AppError(500, "Failed to update task");
        }
    }

    // Delete a task
    async deleteTask(id: string): Promise<void> {
        try {
            await this.prisma.task.delete({
                where: { id },
            });
        } catch (error) {
            throw new AppError(500, "Failed to delete task");
        }
    }

    // Add a dependency (task depends on another task)
    async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
        try {
            await this.prisma.taskDependency.create({
                data: {
                    taskId,
                    dependsOnTaskId,
                },
            });
        } catch (error) {
            throw new AppError(500, "Failed to add dependency. It may already exist.");
        }
    }

    // Remove a dependency
    async removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
        try {
            await this.prisma.taskDependency.deleteMany({
                where: {
                    taskId,
                    dependsOnTaskId,
                },
            });
        } catch (error) {
            throw new AppError(500, "Failed to remove dependency");
        }
    }

    // Check for circular dependency (basic check)
    async hasCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
        // If dependsOnTaskId depends on taskId (directly or indirectly), it's circular
        const visited = new Set<string>();
        const queue: string[] = [dependsOnTaskId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;

            if (currentId === taskId) {
                return true; // Circular dependency found!
            }

            if (visited.has(currentId)) {
                continue;
            }
            visited.add(currentId);

            // Get all tasks that currentId depends on
            const dependencies = await this.prisma.taskDependency.findMany({
                where: { taskId: currentId },
                select: { dependsOnTaskId: true },
            });

            for (const dep of dependencies) {
                queue.push(dep.dependsOnTaskId);
            }
        }

        return false;
    }

    // Create a version entry
    async createVersion(
        taskId: string,
        title: string,
        description: string,
        status: string,
        changelog: string | null
    ): Promise<ITaskVersion> {
        try {
            const maxVersion = await this.prisma.taskVersion.findFirst({
                where: { taskId },
                orderBy: { version: "desc" },
                select: { version: true },
            });

            const nextVersion = maxVersion ? maxVersion.version + 1 : 1;

            return await this.prisma.taskVersion.create({
                data: {
                    taskId,
                    version: nextVersion,
                    title,
                    description,
                    status,
                    changelog,
                },
            }) as ITaskVersion;
        } catch (error) {
            throw new AppError(500, "Failed to create task version");
        }
    }

    // Get version history
    async getVersionHistory(taskId: string): Promise<ITaskVersion[]> {
        try {
            return await this.prisma.taskVersion.findMany({
                where: { taskId },
                orderBy: { version: "desc" },
            }) as ITaskVersion[];
        } catch (error) {
            throw new AppError(500, "Failed to fetch version history");
        }
    }

    // Delete all tasks for a feature
    async deleteTasksByFeatureId(featureId: string): Promise<void> {
        try {
            await this.prisma.task.deleteMany({
                where: { featureId },
            });
        } catch (error) {
            throw new AppError(500, "Failed to delete tasks for the feature");
        }
    }
}
