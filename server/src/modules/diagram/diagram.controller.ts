import { Request, Response, NextFunction } from "express";
import DiagramService from "./diagram.service";
import { IUpdateDiagramData } from "./types/IDiagram";

// Initialize diagrams for an idea (creates placeholders if they don't exist)
export const generateDiagrams = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const targetIdeaId = req.params.ideaId as string;
    const type = req.query.type as string | undefined;
    try {
        let diagrams;
        if (type) {
            diagrams = await DiagramService.initializeSelectedDiagrams(targetIdeaId, [type], next);
        } else {
            diagrams = await DiagramService.initializeDiagrams(targetIdeaId, next);
        }
        if (!diagrams) return;

        res.status(200).json({
            status: "success",
            data: { diagrams },
        });
    } catch (err) {
        next(err);
    }
};

// Stream diagram generation (SSE)
export const generateDiagramStream = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = req.params.id as string;
    try {
        await DiagramService.generateDiagramStream(id, res, next);
    } catch (err) {
        next(err);
    }
};

// Stream diagram regeneration (SSE)
export const regenerateDiagramStream = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = req.params.id as string;
    try {
        await DiagramService.regenerateDiagramStream(id, res, next);
    } catch (err) {
        next(err);
    }
};

// Repair invalid Mermaid diagram syntax
export const repairDiagram = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = req.params.id as string;
    const { code, errorMessage } = req.body;
    try {
        const diagram = await DiagramService.repairDiagram(id, code, errorMessage, next);
        if (!diagram) return;

        res.status(200).json({
            status: "success",
            data: { diagram },
        });
    } catch (err) {
        next(err);
    }
};

// Import custom Mermaid code
export const importDiagram = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const id = req.params.id as string;
    const { code, title } = req.body;
    try {
        const diagram = await DiagramService.updateDiagram(id, {
            mermaidCode: code,
            title: title || undefined,
            activeTier: null, // Clear active tier on manual import/edit
            changelog: "Imported Mermaid file",
        }, next);
        if (!diagram) return;

        res.status(200).json({
            status: "success",
            data: { diagram },
        });
    } catch (err) {
        next(err);
    }
};

// Get all diagrams for an idea
export const getDiagramsByIdea = async (
    req: Request,
    res: Response
) => {
    const targetId = req.params.ideaId as string;
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
    const id = req.params.id as string;
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
    const id = req.params.id as string;
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
    const id = req.params.id as string;
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
    const id = req.params.id as string;
    const versions = await DiagramService.getDiagramVersions(id);

    res.status(200).json({
        status: "success",
        data: {
            versions,
            count: versions.length,
        },
    });
};
