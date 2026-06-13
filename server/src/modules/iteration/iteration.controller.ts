import { NextFunction, Request, Response } from "express";
import IterationService from "./iteration.service";
import AppError from "../../utils/app-error";
import { catchAsync } from "@/utils/catch-async";

export const getSession = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;
        // Auto-create session if it doesn't exist (fixes 404 on first load)
        const session = await IterationService.getOrCreateSession(ideaId, next);

        if (session) {
            res.status(200).json({
                status: "success",
                data: { session }
            });
        }
    }
);

export const postMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Use path param instead of broken x-idea-id header
    const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;
    const { content } = req.body;

    if (!ideaId) {
        return next(new AppError(400, "ideaId is required"));
    }

    if (!content || !content.trim()) {
        return next(new AppError(400, "Message content is required"));
    }

    const message = await IterationService.addMessage(ideaId, "user", content.trim(), next);

    if (message) {
        res.status(201).json({
            status: "success",
            data: { message }
        });
    }
});



