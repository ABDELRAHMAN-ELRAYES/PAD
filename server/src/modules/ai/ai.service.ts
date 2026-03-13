import { NextFunction } from "express";
import config from "../../config/config";
import AppError from "../../utils/app-error";
import { IIdeaAnalysisResult, IGeneratedDocumentContent } from "./types/IAi";
import { buildAnalyzeIdeaPrompt, buildReanalyzeWithAnswersPrompt, IQuestionAnswerInput } from "./prompts/analyze-idea.prompt";
import { buildGeneratePRDPrompt } from "./prompts/generate-prd.prompt";
import { buildGenerateBRDPrompt } from "./prompts/generate-brd.prompt";
import { buildDiagramPrompt, DiagramType, IGeneratedDiagram } from "./prompts/generate-diagram.prompt";
import { buildGenerateWorkflowPrompt } from "./prompts/generate-workflow.prompt";
import { buildIterationPrompt } from "./prompts/iteration.prompt";
import { IGeneratedWorkflowStep } from "../workflow/types/IWorkflow";
import { IFeature } from "../feature/types/IFeature";
import { ITask } from "../task/types/ITask";

// Puter.js type (using any for the instance since types aren't fully exposed for init method)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PuterInstance = any;

class AiService {
    private static MAX_RETRIES = 2;
    private static puter: PuterInstance | null = null;

    // Initialize Puter client with auth token
    private static getPuter(): PuterInstance {
        if (!this.puter) {
            if (!config.puter.authToken) {
                // Fallback for non-authenticated usage (might be limited/unavailable)
                console.warn("Puter Auth Token not found. AI features might fail.");
            }

            // Use require to load the Node.js specific init function
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { init } = require("@heyputer/puter.js/src/init.cjs");

            this.puter = init(config.puter.authToken);
        }
        return this.puter;
    }
    static async callLLM(prompt: string): Promise<string> {
        const puter = this.getPuter();

        const response = await puter.ai.chat(prompt, {
            model: "claude-sonnet-4-5",
        });

        // Debug: log the response structure
        console.log("Puter AI response:", JSON.stringify(response, null, 2));

        // Extract text content from the response
        // Handle various response formats from Puter.js
        let text: string | undefined;

        // Try response.message.content (array or single)
        if (response.message?.content) {
            const content = response.message.content;
            const firstContent = Array.isArray(content) ? content[0] : content;

            if (typeof firstContent === "string") {
                text = firstContent;
            } else if (firstContent && typeof firstContent === "object" && "text" in firstContent) {
                text = firstContent.text as string;
            }
        }

        // Try response.text directly (some Puter responses use this)
        if (!text && (response as unknown as { text?: string }).text) {
            text = (response as unknown as { text?: string }).text;
        }

        // Try response.content directly
        if (!text && (response as unknown as { content?: string }).content) {
            const content = (response as unknown as { content?: string }).content;
            if (typeof content === "string") {
                text = content;
            }
        }

        if (!text) {
            throw new Error("No text content in response");
        }

        return text;
    }

    // Parse and validate the AI response
    private static parseAnalysisResult(
        responseText: string
    ): IIdeaAnalysisResult | null {
        try {
            // Try to extract JSON from the response
            let jsonStr = responseText.trim();

            // Handle cases where the response is wrapped in markdown code blocks
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonStr);

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
    private static parseDocumentResult(
        responseText: string
    ): IGeneratedDocumentContent | null {
        try {
            let jsonStr = responseText.trim();

            // Handle cases where the response is wrapped in markdown code blocks
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonStr);

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

    // Analyze a software idea
    static async analyzeIdea(
        ideaText: string,
        next: NextFunction
    ): Promise<IIdeaAnalysisResult | void> {
        const prompt = buildAnalyzeIdeaPrompt(ideaText);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const responseText = await this.callLLM(prompt);
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
                new AppError(503, "AI service temporarily unavailable. Please try again.")
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
        next: NextFunction
    ): Promise<IIdeaAnalysisResult | void> {
        const prompt = buildReanalyzeWithAnswersPrompt(ideaText, answers);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const responseText = await this.callLLM(prompt);
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
                new AppError(503, "AI service temporarily unavailable. Please try again.")
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

    // Generate PRD document
    static async generatePRD(
        ideaText: string,
        analysisResult: unknown,
        next: NextFunction
    ): Promise<IGeneratedDocumentContent | void> {
        const prompt = buildGeneratePRDPrompt(ideaText, analysisResult);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const responseText = await this.callLLM(prompt);
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
                new AppError(503, "AI service temporarily unavailable. Please try again.")
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

    // Generate BRD document
    static async generateBRD(
        ideaText: string,
        analysisResult: unknown,
        next: NextFunction
    ): Promise<IGeneratedDocumentContent | void> {
        const prompt = buildGenerateBRDPrompt(ideaText, analysisResult);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const responseText = await this.callLLM(prompt);
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
                new AppError(503, "AI service temporarily unavailable. Please try again.")
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
    private static parseDiagramResult(
        responseText: string
    ): IGeneratedDiagram | null {
        try {
            let jsonStr = responseText.trim();

            // Handle markdown code blocks
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonStr);

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

    // Generate a Mermaid diagram
    static async generateDiagram(
        type: DiagramType,
        ideaText: string,
        next: NextFunction
    ): Promise<IGeneratedDiagram | void> {
        const prompt = buildDiagramPrompt(type, ideaText);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const responseText = await this.callLLM(prompt);
                const result = this.parseDiagramResult(responseText);

                if (result) {
                    return result;
                }

                if (attempt < this.MAX_RETRIES) {
                    console.log(`Diagram generation retry ${attempt}: Invalid JSON response`);
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
                new AppError(503, "AI service temporarily unavailable. Please try again.")
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
        };

        return fallbacks[type];
    }
    static async generateWorkflow(
        ideaText: string,
        features: (IFeature & { tasks: ITask[] })[],
        taskDependencies: Record<string, string[]>,
        next: NextFunction
    ): Promise<IGeneratedWorkflowStep[] | void> {
        const prompt = buildGenerateWorkflowPrompt(ideaText, features, taskDependencies);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const responseText = await this.callLLM(prompt);

                // Extract JSON block
                const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                    responseText.match(/```\n([\s\S]*?)\n```/);

                const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

                const parsed = JSON.parse(jsonStr);

                if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
                    return parsed.steps as IGeneratedWorkflowStep[];
                }

                if (attempt < this.MAX_RETRIES) {
                    console.log(`Workflow generation retry ${attempt}: Invalid JSON response`);
                    continue;
                }
            } catch (error) {
                lastError = error as Error;
                console.error(`Workflow generation attempt ${attempt} failed:`, error);

                if (attempt < this.MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
            }
        }

        if (lastError) {
            console.error("Workflow generation failed after retries:", lastError);
            return next(new AppError(503, "AI service temporarily unavailable. Please try again."));
        }
    }

    static async processIteration(
        ideaText: string,
        history: { role: string; content: string }[],
        feedback: string,
        context: any,
        next: NextFunction
    ): Promise<any | void> {
        const prompt = buildIterationPrompt(ideaText, history, feedback, context);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const responseText = await this.callLLM(prompt);

                // Extract JSON block
                const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                    responseText.match(/```\n([\s\S]*?)\n```/);

                const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

                const parsed = JSON.parse(jsonStr);

                if (parsed && (parsed.response || parsed.suggestion)) {
                    return parsed;
                }

                if (attempt < this.MAX_RETRIES) {
                    console.log(`Iteration processing retry ${attempt}: Invalid JSON response`);
                    continue;
                }
            } catch (error) {
                lastError = error as Error;
                console.error(`Iteration processing attempt ${attempt} failed:`, error);

                if (attempt < this.MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
            }
        }

        if (lastError) {
            console.error("Iteration processing failed after retries:", lastError);
            return next(new AppError(503, "AI service temporarily unavailable. Please try again."));
        }
    }
}

export default AiService;
