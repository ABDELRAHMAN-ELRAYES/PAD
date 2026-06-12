import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catch-async";
import IRService from "./ir.service";
import IdeaRepository from "../idea/idea.repository";
import AppError from "../../utils/app-error";
import { IUser } from "../user/types/IUser";

// Check user ownership helper
async function checkOwnership(ideaId: string, request: Request, next: NextFunction): Promise<boolean> {
  const idea = await IdeaRepository.getInstance().getIdeaById(ideaId);
  if (!idea) {
    next(new AppError(404, "Idea not found"));
    return false;
  }
  const currentUser = request.user as IUser;
  if (idea.userId !== currentUser.id) {
    next(new AppError(403, "Not authorized to access this idea"));
    return false;
  }
  return true;
}

// GET /ideas/:id/ir
export const getIR = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    if (!(await checkOwnership(ideaId, request, next))) return;

    const ir = await IRService.getIR(ideaId, next);
    if (!ir) return;

    response.status(200).json({
      status: "success",
      data: { ir },
    });
  }
);

// POST /ideas/:id/ir/generate
export const generateInitialIR = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    if (!(await checkOwnership(ideaId, request, next))) return;

    const currentUser = request.user as IUser;
    const ir = await IRService.generateInitialIR(ideaId, currentUser.id, next);
    if (!ir) return;

    response.status(201).json({
      status: "success",
      message: "Intermediate Representation generated successfully",
      data: { ir },
    });
  }
);

// POST /ideas/:id/ir
export const updateIR = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    if (!(await checkOwnership(ideaId, request, next))) return;

    const { schemaData, changelog } = request.body;
    if (!schemaData) {
      return next(new AppError(400, "Missing schemaData in request body"));
    }

    const result = await IRService.updateIRDirectly(ideaId, schemaData, changelog || "Manual tree edits", next);
    if (!result) return;

    response.status(200).json({
      status: "success",
      message: "IR updated successfully",
      data: result,
    });
  }
);

// POST /ideas/:id/ir/patch
export const patchIR = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    if (!(await checkOwnership(ideaId, request, next))) return;

    const { requestText } = request.body;
    if (!requestText) {
      return next(new AppError(400, "Missing requestText in request body"));
    }

    const currentUser = request.user as IUser;
    const ir = await IRService.patchIR(ideaId, requestText, currentUser.id, next);
    if (!ir) return;

    response.status(200).json({
      status: "success",
      message: "IR patched successfully using natural language modifications",
      data: { ir },
    });
  }
);

// POST /ideas/:id/ir/compile
export const compileIR = catchAsync(
  async (request: Request, response: Response, next: NextFunction) => {
    const ideaId = request.params.id as string;
    if (!(await checkOwnership(ideaId, request, next))) return;

    const { selectedDiagrams } = request.body;
    if (!selectedDiagrams || !Array.isArray(selectedDiagrams)) {
      return next(new AppError(400, "Missing or invalid selectedDiagrams array in request body"));
    }

    const currentUser = request.user as IUser;
    const compileResult = await IRService.compileIR(ideaId, selectedDiagrams, currentUser.id, next);
    if (!compileResult) return;

    response.status(200).json({
      status: "success",
      message: "System compiled from Intermediate Representation successfully",
      data: compileResult,
    });
  }
);
