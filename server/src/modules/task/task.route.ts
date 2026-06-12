import { Router } from "express";
import {
    suggestTasks,
    createTask,
    getTask,
    getTasksByFeature,
    getTaskWithDependencies,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addDependency,
    removeDependency,
    getVersionHistory,
} from "./task.controller";

const TaskRouter: Router = Router();

// TODO: Re-enable authentication before production
// All routes require authentication
// TaskRouter.use(AuthMiddleware.protect);

// Suggest tasks for a feature
TaskRouter.route("/suggest/:featureId")
    .post(suggestTasks);

// Base routes
TaskRouter.route("/")
    .post(createTask);

// Get tasks by feature
TaskRouter.route("/feature/:featureId")
    .get(getTasksByFeature);

// Specific task routes
TaskRouter.route("/:id")
    .get(getTask)
    .put(updateTask)
    .delete(deleteTask);

// Get task with dependencies
TaskRouter.route("/:id/full")
    .get(getTaskWithDependencies);

// Status update
TaskRouter.route("/:id/status")
    .patch(updateTaskStatus);

// Version history
TaskRouter.route("/:id/versions")
    .get(getVersionHistory);

// Dependency management
TaskRouter.route("/:id/dependencies/:dependsOnId")
    .post(addDependency)
    .delete(removeDependency);

export default TaskRouter;
