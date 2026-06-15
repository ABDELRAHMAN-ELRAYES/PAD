import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import DiscoveryService from "./discovery.service";
import AppError from "../../utils/app-error";
import { IUser } from "../user/types/IUser";
import PrismaClientSingleton from "../../data-server-clients/prisma-client";

const prisma = PrismaClientSingleton.getPrismaClient();

export const getQuestionnaire = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    const currentUser = request.user as IUser;

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) {
      return next(new AppError(404, "Idea not found"));
    }

    if (idea.userId !== currentUser.id) {
      return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
    }

    const questionnaire = await DiscoveryService.getQuestionnaire(ideaId);

    response.status(200).json({
      status: "success",
      data: { questionnaire }
    });
  }
);

export const submitQuestionnaire = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    const currentUser = request.user as IUser;
    const { responses } = request.body;

    if (!Array.isArray(responses)) {
      return next(new AppError(400, "Responses must be an array"));
    }

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) {
      return next(new AppError(404, "Idea not found"));
    }

    if (idea.userId !== currentUser.id) {
      return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
    }

    const result = await DiscoveryService.submitResponses(ideaId, responses);

    response.status(200).json({
      status: "success",
      data: { response: result }
    });
  }
);

export const regenerateQuestionnaire = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    const currentUser = request.user as IUser;

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) {
      return next(new AppError(404, "Idea not found"));
    }

    if (idea.userId !== currentUser.id) {
      return next(new AppError(403, "غير مصرح لك بالوصول لهذه الفكرة."));
    }

    // Trigger regeneration asynchronously
    DiscoveryService.generateQuestionnaire(ideaId).catch(err => {
      console.error("Async questionnaire generation failed:", err);
    });

    response.status(202).json({
      status: "success",
      message: "Questionnaire generation triggered"
    });
  }
);
