import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import IdeaService from "./idea.service";
import { ICreateIdeaData, IUpdateIdeaData } from "./types/IIdea";
import AppError from "../../utils/app-error";
import { IUser } from "../user/types/IUser";

// Create a new idea
export const createIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const currentUser = request.user as IUser;
        const data: ICreateIdeaData = {
            rawText: request.body.rawText,
            userId: currentUser.id,
        };

        const idea = await IdeaService.createIdea(data, next);
        if (!idea) return;

        response.status(201).json({
            status: "success",
            data: { idea },
        });
    }
);

// Create a new idea from uploaded document
export const createIdeaFromDocument = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const currentUser = request.user as IUser;
        const file = request.file;

        if (!file) {
            return next(new AppError(400, "Please upload a document file."));
        }

        const idea = await IdeaService.createIdeaFromDocument(currentUser.id, file, next);
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
        const currentUser = request.user as IUser;

        const idea = await IdeaService.getIdea(ideaId, next);
        if (!idea) return;

        if (idea.userId !== currentUser.id) {
            return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
        }

        response.status(200).json({
            status: "success",
            data: { idea },
        });
    }
);

// List all ideas
export const listMyIdeas = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const currentUser = request.user as IUser;
        const ideas = await IdeaService.listIdeas(currentUser.id);

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
        const currentUser = request.user as IUser;

        const idea = await IdeaService.getIdea(ideaId, next);
        if (!idea) return;

        if (idea.userId !== currentUser.id) {
            return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
        }

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
        const currentUser = request.user as IUser;

        const idea = await IdeaService.getIdea(ideaId, next);
        if (!idea) return;

        if (idea.userId !== currentUser.id) {
            return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
        }

        const data: IUpdateIdeaData = {
            refinedText: request.body.refinedText,
        };

        const refinedIdea = await IdeaService.refineIdea(ideaId, data, next);
        if (!refinedIdea) return;

        response.status(200).json({
            status: "success",
            data: { idea: refinedIdea },
        });
    }
);

// Confirm an idea
export const confirmIdea = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = request.params.id as string;
        const currentUser = request.user as IUser;

        const idea = await IdeaService.getIdea(ideaId, next);
        if (!idea) return;

        if (idea.userId !== currentUser.id) {
            return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
        }

        const selectedDocuments = request.body.selectedDocuments || ["BRD", "PRD", "SRS"];
        const selectedDiagrams = request.body.selectedDiagrams || ["SYSTEM_ARCHITECTURE", "DATABASE_ERD", "USER_FLOW"];

        const confirmedIdea = await IdeaService.confirmIdea(ideaId, selectedDocuments, selectedDiagrams, next);
        if (!confirmedIdea) return;

        response.status(200).json({
            status: "success",
            message: "Idea confirmed successfully",
            data: { idea: confirmedIdea },
        });
    }
);

// Stream business description generation
export const streamBusinessDescription = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const ideaId = request.params.id as string;
        const currentUser = request.user as IUser;

        const idea = await IdeaService.getIdea(ideaId, next);
        if (!idea) return;

        if (idea.userId !== currentUser.id) {
            return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
        }

        // Set headers for streaming
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Transfer-Encoding", "chunked");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        try {
            await IdeaService.streamBusinessDescription(ideaId, next, (chunk) => {
                response.write(JSON.stringify(chunk) + "\n");
            });
            response.end();
        } catch (err) {
            if (!response.headersSent) {
                return next(err);
            }
            console.error("Business description streaming error:", err);
            response.end();
        }
    }
);
