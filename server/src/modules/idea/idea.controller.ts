import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import IdeaService from "./idea.service";
import { ICreateIdeaData, IUpdateIdeaData } from "./types/IIdea";

// Create a new idea
export const createIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const data: ICreateIdeaData = {
            rawText: request.body.rawText,
        };

        const idea = await IdeaService.createIdea(data, next);
        if (!idea) return;

        response.status(201).json({
            status: "success",
            data: { idea },
        });
    }
);

// Get a specific idea
export const getIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = request.params.id as string;

        const idea = await IdeaService.getIdea(ideaId, next);
        if (!idea) return;

        response.status(200).json({
            status: "success",
            data: { idea },
        });
    }
);

// List all ideas
export const listMyIdeas = catchAsync(
    async (_request: Request, response: Response, _next: NextFunction) => {
        const ideas = await IdeaService.listIdeas();

        response.status(200).json({
            status: "success",
            data: { ideas, count: ideas.length },
        });
    }
);

// Analyze idea with AI
export const analyzeIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = request.params.id as string;

        // Set headers for streaming
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Transfer-Encoding", "chunked");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        try {
            await IdeaService.analyzeIdea(ideaId, next, (chunk) => {
                response.write(JSON.stringify(chunk) + "\n");
            });
            response.end();
        } catch (err) {
            if (!response.headersSent) {
                return next(err);
            }
            console.error("Idea analysis streaming error:", err);
            response.end();
        }
    }
);

// Refine an existing idea
export const refineIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = request.params.id as string;
        const data: IUpdateIdeaData = {
            refinedText: request.body.refinedText,
        };

        const idea = await IdeaService.refineIdea(ideaId, data, next);
        if (!idea) return;

        response.status(200).json({
            status: "success",
            data: { idea },
        });
    }
);

// Confirm an idea
export const confirmIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = request.params.id as string;

        const idea = await IdeaService.confirmIdea(ideaId, next);
        if (!idea) return;

        response.status(200).json({
            status: "success",
            message: "Idea confirmed successfully",
            data: { idea },
        });
    }
);
