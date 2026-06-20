import { NextFunction, Response } from "express";
import AppError from "../../utils/app-error";
import DiagramRepository from "./diagram.repository";
import IdeaRepository from "../idea/idea.repository";
import AiService from "../ai/ai.service";
import { DiagramValidatorService } from "./diagram-validator.service";
import {
    IDiagram,
    IUpdateDiagramData,
    DiagramType,
    DiagramStatus,
} from "./types/IDiagram";

const DIAGRAM_LABELS: Record<string, string> = {
    SYSTEM_ARCHITECTURE: "System Architecture",
    DATABASE_ERD: "Database ERD",
    SEQUENCE: "Sequence Diagram",
    COMPONENT: "Component Diagram",
    DEPLOYMENT: "Deployment Diagram",
    USER_FLOW: "User Flow Diagram",
    CLASS: "Class Diagram",
    STATE: "State Diagram",
    USE_CASE: "Use Case Diagram",
    ACTIVITY: "Activity Diagram",
};

const fallbacks: Record<string, { title: string; mermaidCode: string }> = {
    SYSTEM_ARCHITECTURE: {
        title: "System Architecture",
        mermaidCode: `graph TB\n    subgraph Frontend\n        A[Web App]\n    end\n    subgraph Backend\n        B[API Server]\n        C[Database]\n    end\n    A --> B\n    B --> C`,
    },
    DATABASE_ERD: {
        title: "Database ERD",
        mermaidCode: `erDiagram\n    USER {\n        string id PK\n        string name\n        string email\n    }\n    USER ||--o{ POST : writes`,
    },
    SEQUENCE: {
        title: "Sequence Diagram",
        mermaidCode: `sequenceDiagram\n    participant User\n    participant Service\n    User->>Service: Request\n    Service-->>User: Response`,
    },
    COMPONENT: {
        title: "Component Diagram",
        mermaidCode: `graph TD\n    A[Auth Service] --> B[API Gateway]\n    C[Billing Service] --> B`,
    },
    DEPLOYMENT: {
        title: "Deployment Diagram",
        mermaidCode: `graph TB\n    subgraph Cloud\n        A[App Server]\n        B[DB Instance]\n    end\n    User --> A\n    A --> B`,
    },
    USER_FLOW: {
        title: "User Flow Diagram",
        mermaidCode: `flowchart TD\n    A[Landing Page] --> B{Logged In?}\n    B -->|Yes| C[Dashboard]\n    B -->|No| D[Login Page]`,
    },
    CLASS: {
        title: "Class Diagram",
        mermaidCode: `classDiagram\n    class User {\n        +String name\n        +String email\n        +login()\n    }`,
    },
    STATE: {
        title: "State Diagram",
        mermaidCode: `stateDiagram-v2\n    [*] --> Draft\n    Draft --> Published\n    Published --> [*]`,
    },
    USE_CASE: {
        title: "Use Case Diagram",
        mermaidCode: `graph LR\n    Actor[User] --> UseCase[Create Account]`,
    },
    ACTIVITY: {
        title: "Activity Diagram",
        mermaidCode: `flowchart TD\n    Start --> Process1\n    Process1 --> End`,
    },
};

export function cleanMermaidCode(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith("```")) {
        const lines = clean.split("\n");
        if (lines[0].startsWith("```")) {
            lines.shift();
        }
        if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) {
            lines.pop();
        }
        clean = lines.join("\n").trim();
    }
    return clean;
}

export function extractTitleAndCode(accumulated: string, defaultTitle: string): { title: string; code: string } {
    let clean = cleanMermaidCode(accumulated);
    if (clean.startsWith("%% title:")) {
        const newlineIdx = clean.indexOf("\n");
        if (newlineIdx !== -1) {
            const titleLine = clean.substring(0, newlineIdx);
            const title = titleLine.replace("%% title:", "").trim();
            const code = clean.substring(newlineIdx + 1).trim();
            return { title, code: cleanMermaidCode(code) };
        }
    }
    return { title: defaultTitle, code: clean };
}

class DiagramService {
    private static diagramRepository: DiagramRepository = DiagramRepository.getInstance();
    private static ideaRepository: IdeaRepository = IdeaRepository.getInstance();

    // Helper method to perform the synchronous validation and repair loop (up to 3 attempts)
    private static async validateAndRepairLoop(
        diagramId: string,
        title: string,
        code: string,
        type: string,
        userId?: string
    ): Promise<{ code: string; title: string; status: DiagramStatus; validationError: string | null }> {
        let currentCode = code;
        let currentTitle = title;
        let validation = DiagramValidatorService.validateMermaidSyntax(currentCode, type);

        if (!validation.valid) {
            console.log(`Initial validation failed for diagram ${diagramId}: ${validation.error}. Repairing...`);
            let workingCode = currentCode;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const repaired = await DiagramValidatorService.repairDiagram(workingCode, validation.error || "Syntax Error", userId);
                    const extracted = extractTitleAndCode(repaired, currentTitle);
                    
                    const nextValidation = DiagramValidatorService.validateMermaidSyntax(extracted.code, type);
                    if (nextValidation.valid) {
                        console.log(`LLM repair attempt ${attempt}/3 succeeded for diagram ${diagramId}.`);
                        currentCode = extracted.code;
                        currentTitle = extracted.title;
                        validation = nextValidation;
                        break;
                    } else {
                        console.warn(`LLM repair attempt ${attempt}/3 failed: ${nextValidation.error}`);
                        workingCode = extracted.code;
                        validation = nextValidation;
                    }
                } catch (repairErr) {
                    console.error(`LLM repair attempt ${attempt}/3 encountered error:`, repairErr);
                }
            }

            // If repair failed, do not overwrite with tiny garbage code or '{}'
            if (!validation.valid) {
                if (workingCode && workingCode.trim().length > 5 && workingCode.trim() !== "{}") {
                    currentCode = workingCode;
                }
            }
        }

        const status: DiagramStatus = validation.valid ? "draft" : "repair_failed";
        const validationError = validation.valid ? null : (validation.error || "Syntax validation failed");

        return {
            code: currentCode,
            title: currentTitle,
            status,
            validationError,
        };
    }

    // Initialize all 10 diagram placeholders as draft if they do not exist
    static async initializeDiagrams(ideaId: string, next: NextFunction): Promise<IDiagram[] | void> {
        const idea = await this.ideaRepository.getIdeaById(ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        const existing = await this.diagramRepository.getDiagramsByIdeaId(ideaId);
        const typesToCreate: DiagramType[] = [
            "SYSTEM_ARCHITECTURE",
            "DATABASE_ERD",
            "SEQUENCE",
            "COMPONENT",
            "DEPLOYMENT",
            "USER_FLOW",
            "CLASS",
            "STATE",
            "USE_CASE",
            "ACTIVITY",
        ];

        const created: IDiagram[] = [];
        for (const type of typesToCreate) {
            const match = existing.find((d) => d.type === type);
            if (!match) {
                const label = DIAGRAM_LABELS[type] || type;
                const newDiag = await this.diagramRepository.createDiagram({
                    ideaId,
                    type,
                    title: label,
                    mermaidCode: "",
                });
                created.push(newDiag as IDiagram);
            } else {
                created.push(match as IDiagram);
            }
        }

        return created;
    }

    // Get diagram by ID
    static async getDiagram(diagramId: string, next: NextFunction): Promise<IDiagram | void> {
        const diagram = await this.diagramRepository.getDiagramById(diagramId);
        if (!diagram) {
            return next(new AppError(404, "Diagram not found"));
        }
        return diagram as IDiagram;
    }

    // Get all diagrams for an idea
    static async getDiagramsByIdea(ideaId: string): Promise<IDiagram[]> {
        const diagrams = await this.diagramRepository.getDiagramsByIdeaId(ideaId);
        return diagrams as IDiagram[];
    }

    // Update a diagram
    static async updateDiagram(
        diagramId: string,
        data: IUpdateDiagramData,
        next: NextFunction
    ): Promise<IDiagram | void> {
        const existing = await this.diagramRepository.getDiagramById(diagramId);
        if (!existing) {
            return next(new AppError(404, "Diagram not found"));
        }

        let finalStatus = data.status;
        let validationError = data.validationError;

        if (data.mermaidCode && data.mermaidCode !== existing.mermaidCode) {
            await this.diagramRepository.createVersion(
                diagramId,
                existing.mermaidCode,
                data.changelog || "Manual edit"
            );

            // Run syntax validation check on user manual updates
            const validation = DiagramValidatorService.validateMermaidSyntax(data.mermaidCode, existing.type);
            finalStatus = validation.valid ? "draft" : "repair_failed";
            validationError = validation.valid ? null : (validation.error || "Manual validation failed");
        }

        const updated = await this.diagramRepository.updateDiagram(diagramId, {
            title: data.title,
            mermaidCode: data.mermaidCode,
            status: finalStatus,
            tier1Code: data.tier1Code,
            tier2Code: data.tier2Code,
            tier3Code: data.tier3Code,
            activeTier: data.activeTier,
            validationError,
        });

        return updated as IDiagram;
    }

    // Get diagram with version history
    static async getDiagramWithVersions(diagramId: string, next: NextFunction) {
        const diagram = await this.diagramRepository.getDiagramWithVersions(diagramId);
        if (!diagram) {
            return next(new AppError(404, "Diagram not found"));
        }
        return diagram;
    }

    // Get versions for a diagram
    static async getDiagramVersions(diagramId: string) {
        return await this.diagramRepository.getVersionsByDiagramId(diagramId);
    }

    // Manual/Auxiliary Repair route
    static async repairDiagram(
        diagramId: string,
        code: string,
        errorMessage: string,
        next: NextFunction
    ): Promise<IDiagram | void> {
        const existing = await this.diagramRepository.getDiagramById(diagramId);
        if (!existing) {
            return next(new AppError(404, "Diagram not found"));
        }

        try {
            const repaired = await DiagramValidatorService.repairDiagram(code, errorMessage);
            const { title, code: finalCode } = extractTitleAndCode(repaired, existing.title);

            const validation = DiagramValidatorService.validateMermaidSyntax(finalCode, existing.type);
            const status = validation.valid ? "draft" : "repair_failed";
            const validationError = validation.valid ? null : (validation.error || "Manual repair failed");

            // Avoid saving empty or '{}' strings
            const codeToSave = (finalCode && finalCode.trim().length > 5 && finalCode.trim() !== "{}") ? finalCode : code;

            const updated = await this.diagramRepository.updateDiagram(diagramId, {
                title,
                mermaidCode: codeToSave,
                status,
                validationError,
            });
            return updated as IDiagram;
        } catch (error) {
            console.error("Auto-repair failed:", error);
            return next(new AppError(500, "Failed to auto-repair diagram syntax"));
        }
    }

    // Stream generation via SSE
    static async generateDiagramStream(diagramId: string, res: Response, next: NextFunction) {
        const diagram = await this.diagramRepository.getDiagramById(diagramId);
        if (!diagram) {
            return next(new AppError(404, "Diagram not found"));
        }

        const idea = await this.ideaRepository.getIdeaById(diagram.ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });

        let accumulated = "";
        let currentTitle = diagram.title;

        try {
            const ideaText = idea.refinedText || idea.rawText;
            const stream = AiService.generateDiagramStream(diagram.type as DiagramType, ideaText, idea.userId);

            for await (const chunk of stream) {
                accumulated += chunk;
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }

            // Extract title and cleaned code
            let { title, code } = extractTitleAndCode(accumulated, currentTitle);
            
            if (!code || code.length < 10) {
                console.warn(`Empty or tiny code streamed for ${diagram.type}, using fallback.`);
                const fallback = fallbacks[diagram.type] || fallbacks.DATABASE_ERD;
                title = fallback.title;
                code = fallback.mermaidCode;
            }

            // Validate and execute the auto-repair loop
            const result = await this.validateAndRepairLoop(diagramId, title, code, diagram.type, idea.userId);

            await this.diagramRepository.updateDiagram(diagramId, {
                title: result.title,
                mermaidCode: result.code,
                status: result.status,
                validationError: result.validationError,
            });

            res.write(`event: complete\ndata: ${JSON.stringify({
                title: result.title,
                code: result.code,
                status: result.status,
                validationError: result.validationError,
            })}\n\n`);
            res.end();
        } catch (error) {
            console.error("Stream generation error:", error);
            res.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Stream failed" })}\n\n`);
            res.end();
        }
    }

    // Stream regeneration via SSE
    static async regenerateDiagramStream(diagramId: string, res: Response, next: NextFunction) {
        const diagram = await this.diagramRepository.getDiagramById(diagramId);
        if (!diagram) {
            return next(new AppError(404, "Diagram not found"));
        }

        const idea = await this.ideaRepository.getIdeaById(diagram.ideaId);
        if (!idea) {
            return next(new AppError(404, "Idea not found"));
        }

        // Save current version snapshot
        await this.diagramRepository.createVersion(diagramId, diagram.mermaidCode, "Before regeneration");

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });

        let accumulated = "";
        let currentTitle = diagram.title;

        try {
            const ideaText = idea.refinedText || idea.rawText;
            const stream = AiService.generateDiagramStream(diagram.type as DiagramType, ideaText, idea.userId);

            for await (const chunk of stream) {
                accumulated += chunk;
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }

            // Extract title and cleaned code
            let { title, code } = extractTitleAndCode(accumulated, currentTitle);

            if (!code || code.length < 10) {
                console.warn(`Empty or tiny code streamed for regeneration of ${diagram.type}, using fallback.`);
                const fallback = fallbacks[diagram.type] || fallbacks.DATABASE_ERD;
                title = fallback.title;
                code = fallback.mermaidCode;
            }

            // Validate and execute the auto-repair loop
            const result = await this.validateAndRepairLoop(diagramId, title, code, diagram.type, idea.userId);

            await this.diagramRepository.updateDiagram(diagramId, {
                title: result.title,
                mermaidCode: result.code,
                status: result.status,
                validationError: result.validationError,
            });

            res.write(`event: complete\ndata: ${JSON.stringify({
                title: result.title,
                code: result.code,
                status: result.status,
                validationError: result.validationError,
            })}\n\n`);
            res.end();
        } catch (error) {
            console.error("Regeneration stream error:", error);
            res.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Regeneration stream failed" })}\n\n`);
            res.end();
        }
    }
}

export default DiagramService;
