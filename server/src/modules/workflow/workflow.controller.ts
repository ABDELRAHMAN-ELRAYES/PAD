import { Request, Response, NextFunction } from "express";
import { WorkflowService } from "./workflow.service";
import { HandoffCompilerService, SSEStreamWriter } from "./handoff-compiler.service";
import { handoffRepository } from "./workflow.repository";
import { IUpdateArtifactData } from "./types/IWorkflow";
import AppError from "../../utils/app-error";
import * as fs from "fs";

// ============================================================
// Legacy Workflow Controllers (unchanged)
// ============================================================

export const generateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ideaId = req.params.ideaId as string;

        // Set headers for streaming
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        await WorkflowService.generateWorkflow(ideaId, next, (chunk) => {
            res.write(JSON.stringify(chunk) + "\n");
        });
        res.end();
    } catch (error) {
        if (!res.headersSent) {
            next(error);
        } else {
            console.error("Workflow generation streaming error:", error);
            res.end();
        }
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
        return;
    } catch (error) {
        next(error);
        return;
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
        return;
    } catch (error) {
        next(error);
        return;
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
        return;
    } catch (error) {
        next(error);
        return;
    }
};

// ============================================================
// Handoff Package Controllers
// ============================================================

/**
 * POST /handoff/generate/:ideaId
 * SSE stream — compiles AI IDE handoff package
 */
export const compileHandoff = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ideaId = req.params.ideaId as string;

        // SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const sse = new SSEStreamWriter(res);

        try {
            await HandoffCompilerService.compilePackage(ideaId, sse);
        } catch (err: any) {
            console.error("Handoff compile error:", err);
            sse.error(err?.message || "Compilation failed");
        } finally {
            res.end();
        }
    } catch (error) {
        if (!res.headersSent) {
            next(error);
        } else {
            res.end();
        }
    }
};

/**
 * GET /handoff/idea/:ideaId
 * Returns latest package with artifact tree (no content)
 */
export const getHandoffByIdea = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ideaId = req.params.ideaId as string;
        const pkg = await handoffRepository.getLatestPackageByIdeaId(ideaId);

        if (!pkg) {
            return res.status(200).json({
                status: "success",
                data: { package: null },
            });
        }

        return res.status(200).json({
            status: "success",
            data: { package: pkg },
        });
    } catch (error) {
        next(error);
        return;
    }
};

/**
 * GET /handoff/artifacts/:id
 * Returns single artifact with full content
 */
export const getArtifact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const artifactId = req.params.id as string;
        const artifact = await handoffRepository.getArtifactById(artifactId);

        if (!artifact) {
            return next(new AppError(404, "Artifact not found."));
        }

        return res.status(200).json({
            status: "success",
            data: { artifact },
        });
    } catch (error) {
        next(error);
        return;
    }
};

/**
 * PUT /handoff/artifacts/:id
 * Update artifact content, creates version snapshot
 */
export const updateArtifact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const artifactId = req.params.id as string;
        const { content, changelog }: IUpdateArtifactData = req.body;

        if (!content) {
            return next(new AppError(400, "content is required."));
        }

        const updated = await handoffRepository.updateArtifactContent(artifactId, content, changelog);

        return res.status(200).json({
            status: "success",
            data: { artifact: updated },
        });
    } catch (error) {
        next(error);
        return;
    }
};

/**
 * GET /handoff/download/:packageId
 * Stream ZIP file binary to client
 */
export const downloadZip = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const packageId = req.params.packageId as string;
        const pkg = await handoffRepository.getPackageWithArtifacts(packageId);

        if (!pkg) {
            return next(new AppError(404, "Package not found."));
        }

        if (!pkg.zipPath || !fs.existsSync(pkg.zipPath)) {
            return next(new AppError(404, "ZIP file not found. Please regenerate the package."));
        }

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=handoff-${pkg.ideaId}-v${pkg.version}.zip`
        );

        const fileStream = fs.createReadStream(pkg.zipPath);
        fileStream.pipe(res);
    } catch (error) {
        next(error);
        return;
    }
};

/**
 * GET /handoff/prompt/:packageId
 * Returns compiled master prompt string for clipboard
 */
export const getMasterPrompt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const packageId = req.params.packageId as string;
        const promptText = await HandoffCompilerService.compileMasterPromptString(packageId);

        return res.status(200).json({
            status: "success",
            data: { prompt: promptText },
        });
    } catch (error) {
        next(error);
        return;
    }
};
