import { Request, Response, NextFunction } from "express";
import { WorkflowService } from "./workflow.service";

export const generateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ideaId = req.params.ideaId as string;
        const workflow = await WorkflowService.generateWorkflow(ideaId, next);

        if (workflow) {
            return res.status(201).json({
                status: "success",
                data: { workflow },
            });
        }
    } catch (error) {
        next(error);
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
    } catch (error) {
        next(error);
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
    } catch (error) {
        next(error);
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
    } catch (error) {
        next(error);
    }
};
