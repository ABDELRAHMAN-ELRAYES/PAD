import { NextFunction, Request, Response } from "express";
import IterationService from "./iteration.service";
import AppError from "../../utils/app-error";
import { catchAsync } from "@/utils/catch-async";

export const getSession = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { ideaId } = req.params;
        const session = await IterationService.getSession(ideaId, next);

        if (session) {
            res.status(200).json({
                status: "success",
                data: { session }
            });
        }
    }
);

export const postMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const ideaId = req.headers["x-idea-id"] as string;
    const { content } = req.body;

    const message = await IterationService.addMessage(ideaId, "user", content, next);

    if (message) {
        // TODO: Trigger AI processing in background

        res.status(201).json({
            status: "success",
            data: { message }
        });
    }
}
);

export const approveSuggestion = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const ideaId = req.headers["x-idea-id"] as string;
    const { suggestionId } = req.params; // Keep this line to get suggestionId from params
    const suggestion = await IterationService.approveSuggestion(suggestionId, next);

    if (suggestion) {
        res.status(200).json({
            status: "success",
            data: { suggestion }
        });
    }
}
);
