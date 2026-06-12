import { Request, Response, NextFunction } from "express";
import { WorkflowService } from "./workflow.service";

export const generateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ideaId = req.params.ideaId as string;

        // Set headers for streaming
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        await WorkflowService.generateWorkflow(ideaId, next, (chunk) => {
            res.write(JSON.stringify(chunk) + "\n");
        });
        res.end();
    } catch (error) {
        if (!res.headersSent) {
            next(error);
        } else {
            console.error("Workflow generation streaming error:", error);
            res.end();
        }
    }
};

export const getWorkflowByIdeaId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ideaId = req.params.ideaId as string;
        const workflow = await WorkflowService.getWorkflowByIdeaId(ideaId, next);

        if (workflow) {
            return res.status(200).json({
                status: "success",
                data: { workflow },
            });
        }
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const updateWorkflowStep = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const updateData = req.body;

        const step = await WorkflowService.updateWorkflowStep(id, updateData, next);

        if (step) {
            return res.status(200).json({
                status: "success",
                message: "Workflow step updated successfully",
                data: { step },
            });
        }
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const exportWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const markdown = await WorkflowService.exportWorkflow(id, next);

        if (markdown) {
            return res.status(200).json({
                status: "success",
                data: { export: markdown },
            });
        }
        return;
    } catch (error) {
        next(error);
        return;
    }
};
