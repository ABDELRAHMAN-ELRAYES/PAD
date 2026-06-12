import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import GuidelineService from "./guideline.service";
import AppError from "../../utils/app-error";
import { IUser } from "../user/types/IUser";

export const createGuideline = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const currentUser = request.user as IUser;
        const userId = currentUser.id;
        const { title, content } = request.body;

        const guideline = await GuidelineService.createGuideline(userId, title, content);

        response.status(201).json({
            status: "success",
            data: { guideline },
        });
    }
);

export const uploadGuidelineFile = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const currentUser = request.user as IUser;
        const userId = currentUser.id;
        
        if (!request.file) {
            return next(new AppError(400, "Please upload a file (.txt or .md)."));
        }

        const guideline = await GuidelineService.createGuidelineFromFile(
            userId,
            request.file.filename,
            request.file.originalname,
            request.file.mimetype,
            request.file.path,
            request.file.size
        );

        response.status(201).json({
            status: "success",
            data: { guideline },
        });
    }
);

export const listGuidelines = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const currentUser = request.user as IUser;
        const userId = currentUser.id;
        const guidelines = await GuidelineService.listGuidelines(userId);

        response.status(200).json({
            status: "success",
            data: { guidelines },
        });
    }
);

export const deleteGuideline = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const currentUser = request.user as IUser;
        const userId = currentUser.id;
        const guidelineId = request.params.id as string;

        await GuidelineService.deleteGuideline(guidelineId, userId, next);

        response.status(200).json({
            status: "success",
            message: "Guideline deleted successfully.",
        });
    }
);

export const downloadGuidelineFile = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const currentUser = request.user as IUser;
        const userId = currentUser.id;
        const fileId = request.params.fileId as string;

        const fileRecord = await GuidelineService.downloadFile(fileId, userId, next);
        if (!fileRecord) return;

        response.download(fileRecord.path, fileRecord.originalname);
    }
);
