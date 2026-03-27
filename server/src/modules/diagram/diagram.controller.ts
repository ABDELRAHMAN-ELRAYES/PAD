import { Request, Response, NextFunction } from "express";
import DiagramService from "./diagram.service";
import { IUpdateDiagramData } from "./types/IDiagram";

// Generate diagrams for an idea
export const generateDiagrams = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const targetIdeaId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId as string;

    // Set headers for streaming
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
        await DiagramService.generateDiagrams(targetIdeaId, next, (chunk) => {
            res.write(JSON.stringify(chunk) + "\n");
        });
        res.end();
    } catch (err) {
        if (!res.headersSent) {
            return next(err);
        }
        console.error("Diagram generation streaming error:", err);
        res.end();
    }
};

// Get all diagrams for an idea
export const getDiagramsByIdea = async (
    req: Request,
    res: Response
) => {
    const targetId = Array.isArray(req.params.ideaId) ? req.params.ideaId[0] : req.params.ideaId as string;
    const diagrams = await DiagramService.getDiagramsByIdea(targetId);

    res.status(200).json({
        status: "success",
        data: {
            diagrams,
            count: diagrams.length,
        },
    });
};

// Get a single diagram
export const getDiagram = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const diagram = await DiagramService.getDiagram(id, next);
    if (!diagram) return;

    res.status(200).json({
        status: "success",
        data: { diagram },
    });
};

// Get diagram with versions
export const getDiagramWithVersions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const diagram = await DiagramService.getDiagramWithVersions(id, next);
    if (!diagram) return;

    res.status(200).json({
        status: "success",
        data: { diagram },
    });
};

// Update a diagram
export const updateDiagram = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: IUpdateDiagramData = req.body;

    const diagram = await DiagramService.updateDiagram(id, data, next);
    if (!diagram) return;

    res.status(200).json({
        status: "success",
        data: { diagram },
    });
};

// Get version history
export const getDiagramVersions = async (
    req: Request,
    res: Response
) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const versions = await DiagramService.getDiagramVersions(id);

    res.status(200).json({
        status: "success",
        data: {
            versions,
            count: versions.length,
        },
    });
};

// Regenerate a diagram
export const regenerateDiagram = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const diagram = await DiagramService.regenerateDiagram(id, next);
    if (!diagram) return;

    res.status(200).json({
        status: "success",
        data: { diagram },
    });
};
