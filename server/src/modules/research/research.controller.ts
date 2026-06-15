import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import ResearchOrchestrator from "./research-orchestrator";
import AppError from "../../utils/app-error";
import { IUser } from "../user/types/IUser";
import PrismaClientSingleton from "../../data-server-clients/prisma-client";

const prisma = PrismaClientSingleton.getPrismaClient();

export const runResearch = catchAsync(
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

    // Set headers for Server-Sent Events (SSE)
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();

    const onProgress = (event: any) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Trigger research orchestration and stream progress
    ResearchOrchestrator.runResearch(ideaId, onProgress)
      .then(() => {
        response.end();
      })
      .catch((err) => {
        console.error(`SSE research error for idea ${ideaId}:`, err);
        if (!response.writableEnded) {
          response.write(`data: ${JSON.stringify({ type: "error", message: err.message || "Research failed." })}\n\n`);
          response.end();
        }
      });

    // Handle connection closure
    request.on("close", () => {
      console.log(`SSE connection closed by client for idea ${ideaId}`);
      ResearchOrchestrator.removeListener(ideaId, onProgress);
    });
  }
);

export const getResearchStatus = catchAsync(
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

    const job = await prisma.researchJob.findUnique({
      where: { ideaId }
    });

    response.status(200).json({
      status: "success",
      data: {
        job,
        ideaStatus: idea.status,
        researchResult: idea.researchResult,
      }
    });
  }
);
