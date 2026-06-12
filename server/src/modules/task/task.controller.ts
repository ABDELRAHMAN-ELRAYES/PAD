import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import TaskService from "./task.service";
import { ICreateTaskData, IUpdateTaskData, TaskStatus } from "./types/ITask";

export const suggestTasks = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = request.params.featureId as string;
        const tasks = await TaskService.suggestTasksForFeature(featureId, next);
        if (!tasks) return;

        response.status(201).json({
            status: "success",
            message: "Tasks suggested successfully",
            data: { tasks, count: tasks.length },
        });
    }
);

export const createTask = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const featureId = request.body.featureId as string;
        const data: ICreateTaskData = {
            title: request.body.title,
            description: request.body.description,
            priority: request.body.priority,
            estimatedEffort: request.body.estimatedEffort,
            order: request.body.order,
        };

        const task = await TaskService.createTask(featureId, data, next);
        if (!task) return;

        response.status(201).json({
            status: "success",
            message: "Task created successfully",
            data: { task },
        });
    }
);

export const getTask = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const taskId = request.params.id as string;
        const task = await TaskService.getTask(taskId, next);
        if (!task) return;

        response.status(200).json({
            status: "success",
            data: { task },
        });
    }
);

export const getTasksByFeature = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const featureId = request.params.featureId as string;
        const tasks = await TaskService.getTasksByFeature(featureId);

        response.status(200).json({
            status: "success",
            data: { tasks, count: tasks.length },
        });
    }
);

export const getTaskWithDependencies = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const taskId = request.params.id as string;
        const task = await TaskService.getTaskWithDependencies(taskId, next);
        if (!task) return;

        response.status(200).json({
            status: "success",
            data: { task },
        });
    }
);

export const updateTask = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const taskId = request.params.id as string;
        const data: IUpdateTaskData = {
            title: request.body.title,
            description: request.body.description,
            priority: request.body.priority,
            status: request.body.status,
            estimatedEffort: request.body.estimatedEffort,
            order: request.body.order,
            changelog: request.body.changelog,
        };

        const task = await TaskService.updateTask(taskId, data, next);
        if (!task) return;

        response.status(200).json({
            status: "success",
            message: "Task updated successfully",
            data: { task },
        });
    }
);

export const updateTaskStatus = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const taskId = request.params.id as string;
        const status: TaskStatus = request.body.status;

        const task = await TaskService.updateTaskStatus(taskId, status, next);
        if (!task) return;

        response.status(200).json({
            status: "success",
            message: "Task status updated successfully",
            data: { task },
        });
    }
);

export const deleteTask = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const taskId = request.params.id as string;
        await TaskService.deleteTask(taskId, next);

        response.status(204).json({
            status: "success",
            message: "Task deleted successfully",
        });
    }
);

export const addDependency = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const taskId = request.params.id as string;
        const dependsOnId = request.params.dependsOnId as string;

        await TaskService.addDependency(taskId, dependsOnId, next);

        response.status(200).json({
            status: "success",
            message: "Dependency added successfully",
        });
    }
);

export const removeDependency = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const taskId = request.params.id as string;
        const dependsOnId = request.params.dependsOnId as string;

        await TaskService.removeDependency(taskId, dependsOnId);

        response.status(200).json({
            status: "success",
            message: "Dependency removed successfully",
        });
    }
);

export const getVersionHistory = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const taskId = request.params.id as string;
        const versions = await TaskService.getVersionHistory(taskId, next);
        if (!versions) return;

        response.status(200).json({
            status: "success",
            data: { versions, count: versions.length },
        });
    }
);
