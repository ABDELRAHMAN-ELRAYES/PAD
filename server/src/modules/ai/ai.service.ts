import { NextFunction } from "express";
import AppError from "../../utils/app-error";
import { IIdeaAnalysisResult, IGeneratedDocumentContent } from "./types/IAi";
import {
  buildAnalyzeIdeaPrompt,
  buildReanalyzeWithAnswersPrompt,
  IQuestionAnswerInput,
} from "./prompts/analyze-idea.prompt";
import { buildGeneratePRDPrompt } from "./prompts/generate-prd.prompt";
import { buildGenerateBRDPrompt } from "./prompts/generate-brd.prompt";
import {
  buildDiagramPrompt,
  DiagramType,
  IGeneratedDiagram,
} from "./prompts/generate-diagram.prompt";
import { buildGenerateWorkflowPrompt } from "./prompts/generate-workflow.prompt";
import { IGeneratedWorkflowStep } from "../workflow/types/IWorkflow";
import { IFeature } from "../feature/types/IFeature";
import { ITask } from "../task/types/ITask";
import OllamaClient from "./ollama-client";
import { QdrantClient } from "../../data-server-clients/qdrant";

class AiService {
  private static MAX_RETRIES = 2;

  private static extractJSON(text: string): string {
    const startCurly = text.indexOf('{');
    const startSquare = text.indexOf('[');
    
    let startIndex = -1;
    if (startCurly !== -1 && startSquare !== -1) {
      startIndex = Math.min(startCurly, startSquare);
    } else if (startCurly !== -1) {
      startIndex = startCurly;
    } else if (startSquare !== -1) {
      startIndex = startSquare;
    }
    
    if (startIndex === -1) {
      return text.trim();
    }

    const endCurly = text.lastIndexOf('}');
    const endSquare = text.lastIndexOf(']');
    const endIndex = Math.max(endCurly, endSquare);

    if (endIndex === -1 || endIndex < startIndex) {
      return text.substring(startIndex).trim();
    }

    return text.substring(startIndex, endIndex + 1).trim();
  }

  private static repairJSON(str: string): string {
    let result = '';
    let inString = false;
    let escaped = false;
    const stack: string[] = [];

    const getNextNonWhitespace = (index: number): string => {
      for (let i = index; i < str.length; i++) {
        const char = str[i];
        if (/\s/.test(char)) continue;
        return char;
      }
      return '';
    };

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escaped) {
        if (char === '\n') {
          result += 'n';
        } else if (char === '\r') {
          result += 'r';
        } else {
          result += char;
        }
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        result += char;
        continue;
      }

      if (char === '"' || char === '`') {
        if (inString) {
          const nextChar = getNextNonWhitespace(i + 1);
          const isValidClosing =
            nextChar === ':' ||
            nextChar === ',' ||
            nextChar === '}' ||
            nextChar === ']' ||
            nextChar === '';
          
          if (isValidClosing) {
            inString = false;
            result += '"';
          } else {
            if (char === '"') {
              result += '\\"';
            } else {
              result += '`';
            }
          }
        } else {
          inString = true;
          result += '"';
        }
        continue;
      }

      if (inString) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      } else {
        if (char === '{') {
          stack.push('}');
        } else if (char === '[') {
          stack.push(']');
        } else if (char === '}') {
          if (stack[stack.length - 1] === '}') {
            stack.pop();
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === ']') {
            stack.pop();
          }
        }
        result += char;
      }
    }

    if (inString) {
      result += '"';
    }

    while (stack.length > 0) {
      result += stack.pop();
    }

    return result;
  }

  public static robustJSONParse<T>(text: string): T {
    const extracted = this.extractJSON(text);
    const repaired = this.repairJSON(extracted);
    return JSON.parse(repaired) as T;
  }

  static async callLLM(
    prompt: string,
    formatJson: boolean | Record<string, any> = false,
    systemPrompt?: string,
    userId?: string
  ): Promise<string> {
    const ollama = OllamaClient.getInstance();

    let finalSystemPrompt = systemPrompt;
    if (userId) {
      try {
        const guidelines = await QdrantClient.searchGuidelines(userId, prompt, 4);
        if (guidelines.length > 0) {
          const contextText = guidelines
            .map((g, idx) => `[Guideline ${idx + 1}] "${g.title}":\n${g.text}`)
            .join("\n\n");
          
          const ragInstructions = `\n\nAdhere strictly to the following best practice system design and architecture decisions uploaded by the user:\n\n${contextText}\n\nStrictly prioritize these design decisions in your choices.`;
          finalSystemPrompt = (systemPrompt || "") + ragInstructions;
        }
      } catch (error) {
        console.error("RAG search error in callLLM:", error);
      }
    }

    const response = await ollama.chat(prompt, finalSystemPrompt, formatJson);
    console.log("Ollama AI response received");
    return response;
  }

  static async *callLLMStream(
    prompt: string,
    systemPrompt?: string,
    userId?: string
  ): AsyncGenerator<string> {
    const ollama = OllamaClient.getInstance();

    let finalSystemPrompt = systemPrompt;
    if (userId) {
      try {
        const guidelines = await QdrantClient.searchGuidelines(userId, prompt, 4);
        if (guidelines.length > 0) {
          const contextText = guidelines
            .map((g, idx) => `[Guideline ${idx + 1}] "${g.title}":\n${g.text}`)
            .join("\n\n");
          
          const ragInstructions = `\n\nAdhere strictly to the following best practice system design and architecture decisions uploaded by the user:\n\n${contextText}\n\nStrictly prioritize these design decisions in your choices.`;
          finalSystemPrompt = (systemPrompt || "") + ragInstructions;
        }
      } catch (error) {
        console.error("RAG search error in callLLMStream:", error);
      }
    }

    yield* ollama.chatStream(prompt, finalSystemPrompt);
  }

  // Parse and validate the AI response
  static parseAnalysisResult(
    responseText: string,
  ): IIdeaAnalysisResult | null {
    try {
      const parsed = this.robustJSONParse<any>(responseText);

      // Validate the structure
      if (
        !Array.isArray(parsed.missingDetails) ||
        !Array.isArray(parsed.complementarySuggestions) ||
        !Array.isArray(parsed.constraintsAndRisks) ||
        !Array.isArray(parsed.clarifyingQuestions)
      ) {
        return null;
      }

      return {
        missingDetails: parsed.missingDetails,
        complementarySuggestions: parsed.complementarySuggestions,
        constraintsAndRisks: parsed.constraintsAndRisks,
        clarifyingQuestions: parsed.clarifyingQuestions,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return null;
    }
  }

  // Parse document generation response
  static parseDocumentResult(
    responseText: string,
  ): IGeneratedDocumentContent | null {
    try {
      const parsed = this.robustJSONParse<any>(responseText);

      // Validate the structure
      if (!parsed.title || !parsed.content) {
        return null;
      }

      return {
        title: parsed.title,
        content: parsed.content,
      };
    } catch (error) {
      console.error("Failed to parse document response:", error);
      return null;
    }
  }

  // Analyze a software idea (Streaming)
  static async *analyzeIdeaStream(ideaText: string, userId?: string): AsyncGenerator<string> {
    const prompt = buildAnalyzeIdeaPrompt(ideaText);
    yield* this.callLLMStream(prompt, undefined, userId);
  }

  // Analyze a software idea
  static async analyzeIdea(
    ideaText: string,
    next: NextFunction,
    userId?: string,
  ): Promise<IIdeaAnalysisResult | void> {
    const prompt = buildAnalyzeIdeaPrompt(ideaText);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const responseText = await this.callLLM(prompt, true, undefined, userId);
        const result = this.parseAnalysisResult(responseText);

        if (result) {
          return result;
        }

        // If parsing failed but no exception, try again
        if (attempt < this.MAX_RETRIES) {
          console.log(`Retry ${attempt}: Invalid JSON response, retrying...`);
          continue;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`AI call attempt ${attempt} failed:`, error);

        if (attempt < this.MAX_RETRIES) {
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    // All retries exhausted - return a graceful fallback
    if (lastError) {
      console.error("AI analysis failed after retries:", lastError);
      return next(
        new AppError(
          503,
          "AI service temporarily unavailable. Please try again.",
        ),
      );
    }

    // Parsing failed after retries - return fallback response
    return {
      missingDetails: [
        "Unable to fully analyze the idea at this time. Please provide more details.",
      ],
      complementarySuggestions: [],
      constraintsAndRisks: [
        "AI analysis encountered an issue. Manual review recommended.",
      ],
      clarifyingQuestions: [
        "Could you provide more context about your target users?",
        "What is the primary problem this software aims to solve?",
      ],
    };
  }

  // Re-analyze an idea with user's answers to clarifying questions
  static async reAnalyzeWithAnswers(
    ideaText: string,
    answers: IQuestionAnswerInput[],
    next: NextFunction,
    userId?: string,
  ): Promise<IIdeaAnalysisResult | void> {
    const prompt = buildReanalyzeWithAnswersPrompt(ideaText, answers);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const responseText = await this.callLLM(prompt, true, undefined, userId);
        const result = this.parseAnalysisResult(responseText);

        if (result) {
          return result;
        }

        if (attempt < this.MAX_RETRIES) {
          console.log(`Re-analysis retry ${attempt}: Invalid JSON response`);
          continue;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Re-analysis attempt ${attempt} failed:`, error);

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    if (lastError) {
      console.error("Re-analysis failed after retries:", lastError);
      return next(
        new AppError(
          503,
          "AI service temporarily unavailable. Please try again.",
        ),
      );
    }

    // Fallback: reduced questions assuming user provided some clarity
    return {
      missingDetails: [],
      complementarySuggestions: [
        "Consider documenting the requirements based on your clarifications.",
      ],
      constraintsAndRisks: [
        "AI re-analysis encountered an issue. Please review manually.",
      ],
      clarifyingQuestions: [],
    };
  }

  // Generate PRD document (Streaming)
  static async *generatePRDStream(
    ideaText: string,
    analysisResult: unknown,
    userId?: string,
  ): AsyncGenerator<string> {
    const prompt = buildGeneratePRDPrompt(ideaText, analysisResult);
    yield* this.callLLMStream(prompt, undefined, userId);
  }

  // Generate PRD document
  static async generatePRD(
    ideaText: string,
    analysisResult: unknown,
    next: NextFunction,
    userId?: string,
  ): Promise<IGeneratedDocumentContent | void> {
    const prompt = buildGeneratePRDPrompt(ideaText, analysisResult);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const responseText = await this.callLLM(prompt, true, undefined, userId);
        const result = this.parseDocumentResult(responseText);

        if (result) {
          return result;
        }

        if (attempt < this.MAX_RETRIES) {
          console.log(`PRD generation retry ${attempt}: Invalid JSON response`);
          continue;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`PRD generation attempt ${attempt} failed:`, error);

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    if (lastError) {
      console.error("PRD generation failed after retries:", lastError);
      return next(
        new AppError(
          503,
          "AI service temporarily unavailable. Please try again.",
        ),
      );
    }

    // Fallback PRD
    return {
      title: "PRD: Product Requirements Document",
      content: `<h2>1. Product Overview</h2>
<p>This document outlines the product requirements based on the provided idea. AI generation encountered an issue, please review and update manually.</p>
<h2>2. Original Idea</h2>
<p>${ideaText}</p>
<h2>3. Functional Requirements</h2>
<p>Please define the core features required for this product.</p>
<h2>4. Non-Functional Requirements</h2>
<p>Please specify performance, security, and scalability requirements.</p>`,
    };
  }

  // Generate BRD document (Streaming)
  static async *generateBRDStream(
    ideaText: string,
    analysisResult: unknown,
    userId?: string,
  ): AsyncGenerator<string> {
    const prompt = buildGenerateBRDPrompt(ideaText, analysisResult);
    yield* this.callLLMStream(prompt, undefined, userId);
  }

  // Generate BRD document
  static async generateBRD(
    ideaText: string,
    analysisResult: unknown,
    next: NextFunction,
    userId?: string,
  ): Promise<IGeneratedDocumentContent | void> {
    const prompt = buildGenerateBRDPrompt(ideaText, analysisResult);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const responseText = await this.callLLM(prompt, true, undefined, userId);
        const result = this.parseDocumentResult(responseText);

        if (result) {
          return result;
        }

        if (attempt < this.MAX_RETRIES) {
          console.log(`BRD generation retry ${attempt}: Invalid JSON response`);
          continue;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`BRD generation attempt ${attempt} failed:`, error);

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    if (lastError) {
      console.error("BRD generation failed after retries:", lastError);
      return next(
        new AppError(
          503,
          "AI service temporarily unavailable. Please try again.",
        ),
      );
    }

    // Fallback BRD
    return {
      title: "BRD: Business Requirements Document",
      content: `<h2>1. Executive Summary</h2>
<p>This document outlines the business requirements based on the provided idea. AI generation encountered an issue, please review and update manually.</p>
<h2>2. Business Objectives</h2>
<p>Please define the key business goals for this project.</p>
<h2>3. Original Idea</h2>
<p>${ideaText}</p>
<h2>4. Stakeholders</h2>
<p>Please identify key stakeholders and their interests.</p>`,
    };
  }

  // Parse diagram generation response
  static parseDiagramResult(
    responseText: string,
  ): IGeneratedDiagram | null {
    try {
      const parsed = this.robustJSONParse<any>(responseText);

      if (!parsed.title || !parsed.mermaidCode) {
        return null;
      }

      return {
        title: parsed.title,
        mermaidCode: parsed.mermaidCode,
      };
    } catch (error) {
      console.error("Failed to parse diagram response:", error);
      return null;
    }
  }

  // Generate a Mermaid diagram (Streaming)
  static async *generateDiagramStream(
    type: DiagramType,
    ideaText: string,
    userId?: string,
  ): AsyncGenerator<string> {
    const prompt = buildDiagramPrompt(type, ideaText);
    yield* this.callLLMStream(prompt, undefined, userId);
  }

  // Generate a Mermaid diagram
  static async generateDiagram(
    type: DiagramType,
    ideaText: string,
    next: NextFunction,
    userId?: string,
  ): Promise<IGeneratedDiagram | void> {
    const prompt = buildDiagramPrompt(type, ideaText);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const responseText = await this.callLLM(prompt, true, undefined, userId);
        const result = this.parseDiagramResult(responseText);

        if (result) {
          return result;
        }

        if (attempt < this.MAX_RETRIES) {
          console.log(
            `Diagram generation retry ${attempt}: Invalid JSON response`,
          );
          continue;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Diagram generation attempt ${attempt} failed:`, error);

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    if (lastError) {
      console.error("Diagram generation failed after retries:", lastError);
      return next(
        new AppError(
          503,
          "AI service temporarily unavailable. Please try again.",
        ),
      );
    }

    // Return fallback based on type
    const fallbacks: Record<DiagramType, IGeneratedDiagram> = {
      ERD: {
        title: "Entity Relationship Diagram",
        mermaidCode: `erDiagram
    USER {
        string id PK
        string name
        string email
    }
    NOTE: "AI generation failed - please edit manually"`,
      },
      SEQUENCE: {
        title: "Sequence Diagram",
        mermaidCode: `sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System-->>User: Response
    Note over User,System: AI generation failed - please edit manually`,
      },
      SCHEMA: {
        title: "System Architecture",
        mermaidCode: `graph TB
    subgraph Frontend
        A[Client]
    end
    subgraph Backend
        B[API]
    end
    A --> B
    Note: AI generation failed - please edit manually`,
      },
      FLOWCHART: {
        title: "Process Flowchart",
        mermaidCode: `flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
    style A fill:#f9f
    Note: AI generation failed - please edit manually`,
      },
      ARCHITECTURE: {
        title: "System Architecture",
        mermaidCode: `graph TB
    subgraph Frontend
        A[Client]
    end
    subgraph Backend
        B[API]
    end
    A --> B
    Note: AI generation failed - please edit manually`,
      },
    };

    return fallbacks[type];
  }
  // Generate features (Streaming)
  static async *generateFeaturesStream(
    combinedContent: string,
    userId?: string,
  ): AsyncGenerator<string> {
    const prompt = `Analyze the following software requirements documents and extract the main features that need to be implemented. For each feature, provide a title and detailed description.

${combinedContent}

Extract features in JSON format:
[
  {
    "title": "Feature Title",
    "description": "Detailed description of what this feature should do"
  }
]

Focus on extracting distinct, implementable features. Each feature should be a logical grouping of functionality.`;
    yield* this.callLLMStream(prompt, undefined, userId);
  }

  // Generate workflow (Streaming)
  static async *generateWorkflowStream(
    ideaText: string,
    features: (IFeature & { tasks: ITask[] })[],
    taskDependencies: Record<string, string[]>,
    userId?: string,
  ): AsyncGenerator<string> {
    const prompt = buildGenerateWorkflowPrompt(
      ideaText,
      features,
      taskDependencies,
    );
    yield* this.callLLMStream(prompt, undefined, userId);
  }

  static async generateWorkflow(
    ideaText: string,
    features: (IFeature & { tasks: ITask[] })[],
    taskDependencies: Record<string, string[]>,
    next: NextFunction,
    userId?: string,
  ): Promise<IGeneratedWorkflowStep[] | void> {
    const prompt = buildGenerateWorkflowPrompt(
      ideaText,
      features,
      taskDependencies,
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const responseText = await this.callLLM(prompt, true, undefined, userId);

        const parsed = this.robustJSONParse<any>(responseText);

        if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          return parsed.steps as IGeneratedWorkflowStep[];
        }

        if (attempt < this.MAX_RETRIES) {
          console.log(
            `Workflow generation retry ${attempt}: Invalid JSON response`,
          );
          continue;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Workflow generation attempt ${attempt} failed:`, error);

        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    if (lastError) {
      console.error("Workflow generation failed after retries:", lastError);
      return next(
        new AppError(
          503,
          "AI service temporarily unavailable. Please try again.",
        ),
      );
    }
  }
}

export default AiService;
