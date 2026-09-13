import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UnprocessableEntityException,
  Logger,
} from "@nestjs/common";
import { IRRepository, IProjectIR } from "./ir.repository";
import { IdeaRepository } from "../idea/idea.repository";
import { DocumentRepository } from "../document/document.repository";
import { DiagramRepository } from "../diagram/diagram.repository";
import AiService from "../ai/ai.service";
import { ProjectIRSchema } from "./types/ir.types";
import {
  ProjectIRZodSchema,
  validateSemantics,
  SemanticValidationError,
} from "./utils/ir-validator";
import { buildAnalyzeToIRPrompt } from "./prompts/analyzer.prompt";
import { generateOpenAPISpec } from "./generators/openapi.generator";
import { generateDocumentFromIR } from "./generators/document.generator";
import { generateDiagramFromIR } from "./generators/diagram.generator";
import { DiagramType } from "../diagram/types/IDiagram";

@Injectable()
export class IRService {
  private readonly logger = new Logger(IRService.name);
  private static instance: IRService;

  constructor(
    private readonly irRepository: IRRepository,
    private readonly ideaRepository: IdeaRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly diagramRepository: DiagramRepository,
  ) {
    IRService.instance = this;
  }

  static getInstance(): IRService {
    return IRService.instance;
  }

  static async getIR(ideaId: string, _next?: any): Promise<IProjectIR> {
    return IRService.getInstance().getIR(ideaId);
  }

  static async generateInitialIR(
    ideaId: string,
    userId: string,
    _next?: any,
  ): Promise<IProjectIR> {
    return IRService.getInstance().generateInitialIR(ideaId, userId);
  }

  static async updateIRDirectly(
    ideaId: string,
    schemaData: ProjectIRSchema,
    changelog: string,
    _next?: any,
  ): Promise<{ updated: IProjectIR; warnings: string[] }> {
    return IRService.getInstance().updateIRDirectly(
      ideaId,
      schemaData,
      changelog,
    );
  }

  static async patchIR(
    ideaId: string,
    requestText: string,
    userId: string,
    _next?: any,
  ): Promise<IProjectIR> {
    return IRService.getInstance().patchIR(ideaId, requestText, userId);
  }

  static async compileIR(
    ideaId: string,
    selectedDiagrams: DiagramType[],
    userId: string,
    _next?: any,
  ): Promise<{
    openApiSpec: any;
    documents: any[];
    diagrams: any[];
  }> {
    return IRService.getInstance().compileIR(
      ideaId,
      selectedDiagrams,
      userId,
    );
  }

  // Validate Project IR Schema & Semantics
  validateIR(schema: ProjectIRSchema): {
    isValid: boolean;
    errors: string[];
    semanticErrors: SemanticValidationError[];
  } {
    return IRService.validateIR(schema);
  }

  static validateIR(schema: ProjectIRSchema): {
    isValid: boolean;
    errors: string[];
    semanticErrors: SemanticValidationError[];
  } {
    const errors: string[] = [];
    const zodResult = ProjectIRZodSchema.safeParse(schema);

    if (!zodResult.success) {
      zodResult.error.issues.forEach((err: any) => {
        errors.push(
          `[Schema Error] Path "${err.path.join(".")}": ${err.message}`,
        );
      });
    }

    const semanticErrors = validateSemantics(schema);
    semanticErrors.forEach((err) => {
      errors.push(`[Semantic Error - ${err.type}]: ${err.message}`);
    });

    return {
      isValid: zodResult.success && semanticErrors.length === 0,
      errors,
      semanticErrors,
    };
  }

  // Get current IR and version history
  async getIR(ideaId: string): Promise<IProjectIR> {
    const ir = await this.irRepository.getIRByIdeaId(ideaId);
    if (!ir) {
      throw new NotFoundException(
        "Project IR not found for this idea. Generate it first.",
      );
    }
    return ir;
  }

  // Generate initial IR from a confirmed idea's text
  async generateInitialIR(
    ideaId: string,
    userId: string,
  ): Promise<IProjectIR> {
    const idea = await this.ideaRepository.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    const ideaText =
      idea.businessDescription || idea.refinedText || idea.rawText;
    const prompt = buildAnalyzeToIRPrompt(ideaText);
    const systemPrompt =
      "You are a software architect compiler. You translate natural language software ideas into a precise, structured Intermediate Representation (IR) JSON payload.";

    const response = await AiService.callLLM(
      prompt,
      true,
      systemPrompt,
      userId,
    );

    try {
      const parsedIR = AiService.robustJSONParse<ProjectIRSchema>(response);

      // Perform validation
      const validation = this.validateIR(parsedIR);
      if (validation.errors.length > 0) {
        this.logger.warn(
          "Initial IR generated has soft warnings:",
          validation.errors,
        );
      }

      // Check if IR already exists to either create or update
      const existing = await this.irRepository.getIRByIdeaId(ideaId);
      if (existing) {
        return await this.irRepository.updateIR(
          ideaId,
          parsedIR,
          "Regenerated initial IR",
        );
      } else {
        return await this.irRepository.createIR(ideaId, parsedIR);
      }
    } catch (error) {
      this.logger.error("Generate initial IR error:", error);
      throw new InternalServerErrorException(
        `Failed to parse initial IR: ${error instanceof Error ? error.message : "Invalid JSON format"}`,
      );
    }
  }

  // Update IR via direct edits in the tree editor
  async updateIRDirectly(
    ideaId: string,
    schemaData: ProjectIRSchema,
    changelog: string,
  ): Promise<{ updated: IProjectIR; warnings: string[] }> {
    const zodResult = ProjectIRZodSchema.safeParse(schemaData);
    if (!zodResult.success) {
      const validationErrors = zodResult.error.issues.map(
        (err: any) => `Path "${err.path.join(".")}": ${err.message}`,
      );
      throw new BadRequestException(
        `Invalid IR Schema structure: ${validationErrors.join("; ")}`,
      );
    }

    const semanticErrors = validateSemantics(schemaData);
    const updated = await this.irRepository.updateIR(
      ideaId,
      schemaData,
      changelog,
    );

    return {
      updated,
      warnings: semanticErrors.map(
        (err: any) => `[${err.type}] ${err.message}`,
      ),
    };
  }

  // Patch/Update IR using a natural language request
  async patchIR(
    ideaId: string,
    requestText: string,
    userId: string,
  ): Promise<IProjectIR> {
    const ir = await this.irRepository.getIRByIdeaId(ideaId);
    let existingIR: ProjectIRSchema | undefined = undefined;

    if (ir) {
      existingIR = ir.schemaData;
    }

    const prompt = buildAnalyzeToIRPrompt(requestText, existingIR);
    const systemPrompt =
      "You are an AI system architect. You merge change requests and modifications into an existing structured system Intermediate Representation (IR) JSON schema.";

    const response = await AiService.callLLM(
      prompt,
      true,
      systemPrompt,
      userId,
    );

    try {
      const patchedSchema =
        AiService.robustJSONParse<ProjectIRSchema>(response);

      const zodResult = ProjectIRZodSchema.safeParse(patchedSchema);
      if (!zodResult.success) {
        throw new UnprocessableEntityException(
          "AI-generated delta patch failed structural integrity validation. Please refine request.",
        );
      }

      const changelog = `AI patch: ${requestText}`;
      if (!ir) {
        return await this.irRepository.createIR(ideaId, patchedSchema);
      } else {
        return await this.irRepository.updateIR(
          ideaId,
          patchedSchema,
          changelog,
        );
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      this.logger.error("Patch IR error:", error);
      throw new InternalServerErrorException(
        `Failed to apply delta patch to IR: ${error instanceof Error ? error.message : "Invalid format"}`,
      );
    }
  }

  // Compile unified IR into client-selected artifacts
  async compileIR(
    ideaId: string,
    selectedDiagrams: DiagramType[],
    userId: string,
  ): Promise<{
    openApiSpec: any;
    documents: any[];
    diagrams: any[];
  }> {
    const ir = await this.irRepository.getIRByIdeaId(ideaId);
    if (!ir) {
      throw new NotFoundException("Project IR not found. Cannot compile.");
    }

    const idea = await this.ideaRepository.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }

    const schema = ir.schemaData;
    const projectName =
      idea.refinedText?.substring(0, 30) ||
      idea.rawText.substring(0, 30) ||
      "Project API";

    // 1. Generate Deterministic OpenAPI Spec
    const openApiSpec = generateOpenAPISpec(schema, projectName);

    const existingDocs =
      await this.documentRepository.getDocumentsByIdeaId(ideaId);
    const existingDiagrams =
      await this.diagramRepository.getDiagramsByIdeaId(ideaId);

    const compiledDocs = [];
    const compiledDiagrams = [];

    // 2. Generate and update PRD & BRD documents
    const docTypes: ("PRD" | "BRD")[] = ["PRD", "BRD"];
    for (const docType of docTypes) {
      try {
        const docResult = await generateDocumentFromIR(
          docType,
          projectName,
          schema,
          userId,
        );
        const matchedDoc = existingDocs.find((d) => d.type === docType);

        if (matchedDoc) {
          const latestVer =
            await this.documentRepository.getLatestVersionNumber(matchedDoc.id);
          await this.documentRepository.createVersion(
            matchedDoc.id,
            latestVer + 1,
            docResult.content,
            "Recompiled from IR",
          );
          const updatedDoc = await this.documentRepository.updateDocument(
            matchedDoc.id,
            {
              title: docResult.title,
              content: docResult.content,
            },
          );
          compiledDocs.push(updatedDoc);
        } else {
          const newDoc = await this.documentRepository.createDocument({
            ideaId,
            type: docType,
            title: docResult.title,
            content: docResult.content,
          });
          await this.documentRepository.createVersion(
            newDoc.id,
            1,
            docResult.content,
            "Initial compilation from IR",
          );
          compiledDocs.push(newDoc);
        }
      } catch (error) {
        this.logger.error(`Failed to compile document ${docType}:`, error);
      }
    }

    // 3. Generate and update type-parameterized diagrams
    for (const diagType of selectedDiagrams) {
      try {
        const diagResult = await generateDiagramFromIR(
          diagType as any,
          schema,
          userId,
        );
        const matchedDiag = existingDiagrams.find((d) => d.type === diagType);

        if (matchedDiag) {
          await this.diagramRepository.createVersion(
            matchedDiag.id,
            matchedDiag.mermaidCode,
            "Recompiled from IR",
          );
          const updatedDiag = await this.diagramRepository.updateDiagram(
            matchedDiag.id,
            {
              title: diagResult.title,
              mermaidCode: diagResult.tier2,
              tier1Code: diagResult.tier1,
              tier2Code: diagResult.tier2,
              tier3Code: diagResult.tier3,
              activeTier: 2,
            },
          );
          compiledDiagrams.push(updatedDiag);
        } else {
          const newDiag = await this.diagramRepository.createDiagram({
            ideaId,
            type: diagType as any,
            title: diagResult.title,
            mermaidCode: diagResult.tier2,
            tier1Code: diagResult.tier1,
            tier2Code: diagResult.tier2,
            tier3Code: diagResult.tier3,
            activeTier: 2,
          });
          compiledDiagrams.push(newDiag);
        }
      } catch (error) {
        this.logger.error(`Failed to compile diagram ${diagType}:`, error);
      }
    }

    return {
      openApiSpec,
      documents: compiledDocs,
      diagrams: compiledDiagrams,
    };
  }
}

export default IRService;
