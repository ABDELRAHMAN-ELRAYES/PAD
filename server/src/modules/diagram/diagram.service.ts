import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { DiagramRepository } from "./diagram.repository";
import { IdeaRepository } from "../idea/idea.repository";
import { DiagramValidatorService } from "./diagram-validator.service";
import AiService from "../ai/ai.service";
import {
  IDiagram,
  IDiagramVersion,
  IDiagramWithVersions,
  IUpdateDiagramData,
  DiagramType,
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

export function extractTitleAndCode(
  accumulated: string,
  defaultTitle: string,
): { title: string; code: string } {
  const clean = cleanMermaidCode(accumulated);
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

@Injectable()
export class DiagramService {
  private readonly logger = new Logger(DiagramService.name);
  private static instance: DiagramService;

  constructor(
    private readonly diagramRepository: DiagramRepository,
    private readonly ideaRepository: IdeaRepository,
    readonly validatorService: DiagramValidatorService,
  ) {
    DiagramService.instance = this;
  }

  static getInstance(): DiagramService {
    return DiagramService.instance;
  }

  // Initialize all 10 diagram placeholders as draft if they do not exist
  async initializeDiagrams(ideaId: string): Promise<IDiagram[]> {
    const idea = await this.ideaRepository.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
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
        created.push(newDiag);
      } else {
        created.push(match);
      }
    }

    return created;
  }

  // Initialize selected diagrams as draft if they do not exist
  async initializeSelectedDiagrams(
    ideaId: string,
    selectedTypes: string[],
  ): Promise<IDiagram[]> {
    const idea = await this.ideaRepository.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    const existing = await this.diagramRepository.getDiagramsByIdeaId(ideaId);
    const created: IDiagram[] = [];

    for (const typeStr of selectedTypes) {
      const type = typeStr as DiagramType;
      const match = existing.find((d) => d.type === type);
      if (!match) {
        const label = DIAGRAM_LABELS[type] || type;
        const newDiag = await this.diagramRepository.createDiagram({
          ideaId,
          type,
          title: label,
          mermaidCode: "",
        });
        created.push(newDiag);
      } else {
        created.push(match);
      }
    }

    return created;
  }

  // Get diagram by ID
  async getDiagram(diagramId: string): Promise<IDiagram> {
    const diagram = await this.diagramRepository.getDiagramById(diagramId);
    if (!diagram) {
      throw new NotFoundException("Diagram not found");
    }
    return diagram;
  }

  // Get all diagrams for an idea
  async getDiagramsByIdea(ideaId: string): Promise<IDiagram[]> {
    return this.diagramRepository.getDiagramsByIdeaId(ideaId);
  }

  // Update a diagram
  async updateDiagram(
    diagramId: string,
    data: IUpdateDiagramData,
  ): Promise<IDiagram> {
    const existing = await this.diagramRepository.getDiagramById(diagramId);
    if (!existing) {
      throw new NotFoundException("Diagram not found");
    }

    if (data.mermaidCode && data.mermaidCode !== existing.mermaidCode) {
      await this.diagramRepository.createVersion(
        diagramId,
        existing.mermaidCode,
        data.changelog || "Manual edit",
      );
    }

    const updated = await this.diagramRepository.updateDiagram(diagramId, {
      title: data.title,
      mermaidCode: data.mermaidCode,
      status: data.status || "draft",
      tier1Code: data.tier1Code,
      tier2Code: data.tier2Code,
      tier3Code: data.tier3Code,
      activeTier: data.activeTier,
      validationError: data.validationError || null,
    });

    return updated;
  }

  // Get diagram with version history
  async getDiagramWithVersions(
    diagramId: string,
  ): Promise<IDiagramWithVersions> {
    const diagram = await this.diagramRepository.getDiagramWithVersions(diagramId);
    if (!diagram) {
      throw new NotFoundException("Diagram not found");
    }
    return diagram;
  }

  // Get versions for a diagram
  async getDiagramVersions(diagramId: string): Promise<IDiagramVersion[]> {
    return this.diagramRepository.getVersionsByDiagramId(diagramId);
  }

  // Repair route
  async repairDiagram(
    diagramId: string,
    code: string,
    _errorMessage?: string,
  ): Promise<IDiagram> {
    const existing = await this.diagramRepository.getDiagramById(diagramId);
    if (!existing) {
      throw new NotFoundException("Diagram not found");
    }

    const updated = await this.diagramRepository.updateDiagram(diagramId, {
      title: existing.title,
      mermaidCode: code,
      status: "draft",
      validationError: null,
    });
    return updated;
  }

  // Stream generation via SSE
  async generateDiagramStream(diagramId: string, res: Response): Promise<void> {
    const diagram = await this.diagramRepository.getDiagramById(diagramId);
    if (!diagram) {
      throw new NotFoundException("Diagram not found");
    }

    const idea = await this.ideaRepository.findById(diagram.ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let accumulated = "";
    const currentTitle = diagram.title;

    try {
      res.write(
        `event: status\ndata: ${JSON.stringify({ status: "generating" })}\n\n`,
      );
      const ideaText =
        idea.businessDescription || idea.refinedText || idea.rawText;
      const stream = AiService.generateDiagramStream(
        diagram.type as DiagramType,
        ideaText,
        idea.userId,
      );

      for await (const chunk of stream) {
        accumulated += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      let { title, code } = extractTitleAndCode(accumulated, currentTitle);

      if (!code || code.length < 10) {
        this.logger.warn(
          `Empty or tiny code streamed for ${diagram.type}, using fallback.`,
        );
        const fallback = fallbacks[diagram.type] || fallbacks.DATABASE_ERD;
        title = fallback.title;
        code = fallback.mermaidCode;
      }

      await this.diagramRepository.updateDiagram(diagramId, {
        title,
        mermaidCode: code,
        status: "draft",
        validationError: null,
      });

      res.write(
        `event: complete\ndata: ${JSON.stringify({
          title,
          code,
          status: "draft",
          validationError: null,
        })}\n\n`,
      );
      res.end();
    } catch (error) {
      this.logger.error("Stream generation error:", error);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: error instanceof Error ? error.message : "Stream failed",
        })}\n\n`,
      );
      res.end();
    }
  }

  // Stream regeneration via SSE
  async regenerateDiagramStream(
    diagramId: string,
    res: Response,
  ): Promise<void> {
    const diagram = await this.diagramRepository.getDiagramById(diagramId);
    if (!diagram) {
      throw new NotFoundException("Diagram not found");
    }

    const idea = await this.ideaRepository.findById(diagram.ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    // Save current version snapshot
    await this.diagramRepository.createVersion(
      diagramId,
      diagram.mermaidCode,
      "Before regeneration",
    );

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let accumulated = "";
    const currentTitle = diagram.title;

    try {
      res.write(
        `event: status\ndata: ${JSON.stringify({ status: "generating" })}\n\n`,
      );
      const ideaText =
        idea.businessDescription || idea.refinedText || idea.rawText;
      const stream = AiService.generateDiagramStream(
        diagram.type as DiagramType,
        ideaText,
        idea.userId,
      );

      for await (const chunk of stream) {
        accumulated += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      let { title, code } = extractTitleAndCode(accumulated, currentTitle);

      if (!code || code.length < 10) {
        this.logger.warn(
          `Empty or tiny code streamed for regeneration of ${diagram.type}, using fallback.`,
        );
        const fallback = fallbacks[diagram.type] || fallbacks.DATABASE_ERD;
        title = fallback.title;
        code = fallback.mermaidCode;
      }

      await this.diagramRepository.updateDiagram(diagramId, {
        title,
        mermaidCode: code,
        status: "draft",
        validationError: null,
      });

      res.write(
        `event: complete\ndata: ${JSON.stringify({
          title,
          code,
          status: "draft",
          validationError: null,
        })}\n\n`,
      );
      res.end();
    } catch (error) {
      this.logger.error("Regeneration stream error:", error);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message:
            error instanceof Error ? error.message : "Regeneration stream failed",
        })}\n\n`,
      );
      res.end();
    }
  }
}

export default DiagramService;
