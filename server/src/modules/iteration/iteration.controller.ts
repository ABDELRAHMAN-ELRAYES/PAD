import { NextFunction, Request, Response } from "express";
import IterationService from "./iteration.service";
import ChangePlannerService from "./change-planner.service";
import AppError from "../../utils/app-error";
import { catchAsync } from "@/utils/catch-async";
import SocketService from "../../services/socket.service";

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

export const approveSuggestion = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const suggestionId = Array.isArray(req.params.suggestionId) ? req.params.suggestionId[0] : req.params.suggestionId;
    const suggestion = await IterationService.approveSuggestion(suggestionId, next);

    if (suggestion) {
        res.status(200).json({
            status: "success",
            data: { suggestion }
        });
    }
});

export const rejectSuggestion = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const suggestionId = Array.isArray(req.params.suggestionId) ? req.params.suggestionId[0] : req.params.suggestionId;
    const suggestion = await IterationService.rejectSuggestion(suggestionId, next);

    if (suggestion) {
        res.status(200).json({
            status: "success",
            data: { suggestion }
        });
    }
});

// ── Plan Endpoints ──────────────────────────────────────────

export const generatePlan = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;
    const { content } = req.body;

    if (!ideaId) return next(new AppError(400, "ideaId is required"));
    if (!content || !content.trim()) return next(new AppError(400, "Change request content is required"));

    // Get session
    const session = await IterationService.getOrCreateSession(ideaId, next);
    if (!session) return;

    const socket = SocketService.getInstance();
    socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "planning" });

    try {
        const plan = await ChangePlannerService.generatePlan(ideaId, session.id, content.trim());

        socket.emitToRoom(ideaId, "plan:created", { plan });
        socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "idle" });

        res.status(201).json({
            status: "success",
            data: { plan }
        });
    } catch (err) {
        socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "error" });
        throw err;
    }
});

export const getPlan = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
    const plan = await ChangePlannerService.getPlan(planId);

    if (!plan) return next(new AppError(404, "Plan not found"));

    res.status(200).json({
        status: "success",
        data: { plan }
    });
});

export const confirmPlan = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
    const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;

    if (!ideaId) return next(new AppError(400, "ideaId is required"));

    const socket = SocketService.getInstance();

    // Get session for socket events
    const session = await IterationService.getOrCreateSession(ideaId, next);
    if (!session) return;

    socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "applying" });

    try {
        const plan = await ChangePlannerService.confirmPlan(planId, ideaId);

        socket.emitToRoom(ideaId, "plan:complete", {
            planId: plan.id,
            status: plan.status,
        });

        if (plan.status === "applied") {
            socket.emitToRoom(ideaId, "artifact:updated", {
                ideaId,
                planId: plan.id,
                modulesAffected: [...new Set(plan.actions.map(a => a.module))],
            });
        }

        socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "idle" });

        res.status(200).json({
            status: "success",
            data: { plan }
        });
    } catch (err) {
        socket.emitToRoom(ideaId, "plan:failed", {
            planId,
            error: err instanceof Error ? err.message : "Plan execution failed",
        });
        socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "error" });
        throw err;
    }
});

export const getChangeHistory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;

    if (!ideaId) return next(new AppError(400, "ideaId is required"));

    const plans = await ChangePlannerService.getChangeHistory(ideaId);

    res.status(200).json({
        status: "success",
        data: { plans, count: plans.length }
    });
});

export const rollbackPlan = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
    const ideaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId;

    if (!ideaId) return next(new AppError(400, "ideaId is required"));

    const socket = SocketService.getInstance();
    const session = await IterationService.getOrCreateSession(ideaId, next);
    if (!session) return;

    socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "applying" });

    try {
        const plan = await ChangePlannerService.rollbackPlan(planId);

        socket.emitToRoom(ideaId, "plan:complete", {
            planId: plan.id,
            status: plan.status,
        });

        socket.emitToRoom(ideaId, "artifact:updated", {
            ideaId,
            planId: plan.id,
            modulesAffected: [...new Set(plan.actions.map(a => a.module))],
        });

        socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "idle" });

        res.status(200).json({
            status: "success",
            data: { plan }
        });
    } catch (err) {
        socket.emitToRoom(ideaId, "ai:state", { sessionId: session.id, phase: "error" });
        throw err;
    }
});
