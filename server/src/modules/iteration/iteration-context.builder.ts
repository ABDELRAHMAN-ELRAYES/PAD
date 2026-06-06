/**
 * Builds structured project context for AI prompts.
 * Two modes:
 *   - Summary: includes full idea + analysisResult + reasonable content previews
 *   - Targeted: full content for all modules during modification
 *
 * Also supports artifact reference resolution:
 *   "this diagram", "the ERD", "the PRD" → loads full content for matched artifacts.
 */

import IdeaRepository from "../idea/idea.repository";
import DocumentRepository from "../document/document.repository";
import DiagramRepository from "../diagram/diagram.repository";
import FeatureRepository from "../feature/feature.repository";
import TaskRepository from "../task/task.repository";
import { workflowRepository } from "../workflow/workflow.repository";
import { IFeature } from "../feature/types/IFeature";
import IterationRepository from "./iteration.repository";

// Content limits per mode — higher than before so AI can actually reason about content
const SUMMARY_CONTENT_LIMIT = 2000;
const TARGETED_CONTENT_LIMIT = 5000;
const PLANNER_CONTENT_LIMIT = 200;
const MAX_APPLIED_SUGGESTIONS = 5;
// Max conversation messages to include verbatim (older get summarized)
const MAX_VERBATIM_HISTORY = 10;

export interface ProjectContext {
    idea: {
        rawText: string;
        refinedText: string | null;
        status: string;
        analysisResult: any | null;
    };
    documents: Array<{
        id: string;
        type: string;
        title: string;
        contentPreview: string;
    }>;
    diagrams: Array<{
        id: string;
        type: string;
        title: string;
        mermaidPreview: string;
    }>;
    features: Array<{
        id: string;
        title: string;
        description: string;
        priority: string;
        status: string;
        tasks: Array<{
            id: string;
            title: string;
            description: string;
            status: string;
            priority: string;
        }>;
    }>;
    workflow: {
        id: string;
        status: string;
        steps: Array<{
            id: string;
            title: string;
            description: string;
            instructions?: string;
            status: string;
            order: number;
        }>;
    } | null;
    recentChanges: string[];
}

function truncate(text: string | null | undefined, limit: number): string {
    if (!text) return "";
    if (text.length <= limit) return text;
    return text.substring(0, limit) + "…[truncated]";
}

/**
 * Resolve artifact references in user message.
 * Returns set of artifact IDs that should get full content loaded.
 */
function resolveArtifactReferences(
    message: string,
    ctx: {
        documents: Array<{ id: string; type: string; title: string }>;
        diagrams: Array<{ id: string; type: string; title: string }>;
    }
): Set<string> {
    const referenced = new Set<string>();
    const lower = message.toLowerCase();

    // Document references
    for (const doc of ctx.documents) {
        if (
            lower.includes(doc.type.toLowerCase()) ||
            lower.includes(doc.title.toLowerCase()) ||
            (doc.type === "PRD" && (lower.includes("prd") || lower.includes("product requirements"))) ||
            (doc.type === "BRD" && (lower.includes("brd") || lower.includes("business requirements")))
        ) {
            referenced.add(doc.id);
        }
    }

    // Diagram references
    for (const diag of ctx.diagrams) {
        if (
            lower.includes(diag.type.toLowerCase()) ||
            lower.includes(diag.title.toLowerCase()) ||
            (diag.type === "ERD" && (lower.includes("erd") || lower.includes("entity") || lower.includes("database diagram"))) ||
            (diag.type === "SEQUENCE" && (lower.includes("sequence"))) ||
            (diag.type === "SCHEMA" && (lower.includes("architecture") || lower.includes("schema"))) ||
            (diag.type === "FLOWCHART" && (lower.includes("flowchart") || lower.includes("flow")))
        ) {
            referenced.add(diag.id);
        }
    }

    // Generic references like "this diagram", "the diagram"
    if (lower.includes("this diagram") || lower.includes("the diagram")) {
        // Add all diagrams if ambiguous
        for (const d of ctx.diagrams) referenced.add(d.id);
    }
    if (lower.includes("this document") || lower.includes("the document")) {
        for (const d of ctx.documents) referenced.add(d.id);
    }

    return referenced;
}

export default class IterationContextBuilder {
    /**
     * Build summary context for discussion mode.
     * Includes analysisResult, reasonable content previews, and full content
     * for any artifacts referenced in the user message.
     */
    static async buildSummaryContext(ideaId: string, userMessage?: string): Promise<ProjectContext> {
        return this.buildContext(ideaId, "summary", userMessage);
    }

    /**
     * Build targeted context for modification mode.
     * Includes full content for all modules.
     */
    static async buildTargetedContext(ideaId: string, userMessage?: string): Promise<ProjectContext> {
        return this.buildContext(ideaId, "targeted", userMessage);
    }

    /**
     * Build planner context for change planner.
     * Keeps previews extremely small to prevent context window explosion.
     */
    static async buildPlannerContext(ideaId: string, userMessage?: string): Promise<ProjectContext> {
        return this.buildContext(ideaId, "planner", userMessage);
    }

    private static async buildContext(
        ideaId: string,
        mode: "summary" | "targeted" | "planner",
        userMessage?: string
    ): Promise<ProjectContext> {
        let contentLimit = SUMMARY_CONTENT_LIMIT;
        if (mode === "targeted") contentLimit = TARGETED_CONTENT_LIMIT;
        if (mode === "planner") contentLimit = PLANNER_CONTENT_LIMIT;

        const ideaRepo = IdeaRepository.getInstance();
        const docRepo = DocumentRepository.getInstance();
        const diagramRepo = DiagramRepository.getInstance();
        const featureRepo = FeatureRepository.getInstance();
        const taskRepo = TaskRepository.getInstance();

        // Fetch all data in parallel
        const [idea, documents, diagrams, features, workflow] = await Promise.all([
            ideaRepo.getIdeaById(ideaId),
            docRepo.getDocumentsByIdeaId(ideaId),
            diagramRepo.getDiagramsByIdeaId(ideaId),
            featureRepo.getFeaturesByIdeaId(ideaId),
            workflowRepository.getWorkflowByIdeaId(ideaId),
        ]);

        // Resolve references — load full content for mentioned artifacts
        const referencedIds = userMessage
            ? resolveArtifactReferences(userMessage, {
                documents: documents.map((d: any) => ({ id: d.id, type: d.type, title: d.title })),
                diagrams: diagrams.map((d: any) => ({ id: d.id, type: d.type, title: d.title })),
            })
            : new Set<string>();

        // Build features with tasks
        const featuresWithTasks = await Promise.all(
            features.map(async (f: IFeature) => {
                const tasks = await taskRepo.getTasksByFeatureId(f.id);
                return {
                    id: f.id,
                    title: f.title,
                    description: truncate(f.description, contentLimit),
                    priority: f.priority,
                    status: f.status,
                    tasks: tasks.map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        description: truncate(t.description, contentLimit),
                        status: t.status,
                        priority: t.priority,
                    })),
                };
            })
        );

        // Build workflow context
        let workflowContext: ProjectContext["workflow"] = null;
        if (workflow) {
            workflowContext = {
                id: workflow.id,
                status: workflow.status,
                steps: (workflow.steps || []).map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    description: truncate(s.description, contentLimit),
                    instructions: truncate(s.instructions, contentLimit),
                    status: s.status,
                    order: s.order,
                })),
            };
        }

        // Get recent applied suggestions for context
        const recentChanges = await this.getRecentChanges(ideaId);

        const isPlanner = mode === "planner";
        return {
            idea: {
                rawText: isPlanner ? truncate(idea?.rawText || "", 100) : (idea?.rawText || ""),
                refinedText: isPlanner ? truncate(idea?.refinedText || null, 100) : (idea?.refinedText || null),
                status: idea?.status || "unknown",
                analysisResult: isPlanner ? null : (idea?.analysisResult || null),
            },
            documents: documents.map((d: any) => ({
                id: d.id,
                type: d.type,
                title: d.title,
                contentPreview: referencedIds.has(d.id)
                    ? d.content || ""
                    : truncate(d.content, contentLimit),
            })),
            diagrams: diagrams.map((d: any) => ({
                id: d.id,
                type: d.type,
                title: d.title,
                mermaidPreview: referencedIds.has(d.id)
                    ? d.mermaidCode || ""
                    : truncate(d.mermaidCode, contentLimit),
            })),
            features: featuresWithTasks,
            workflow: workflowContext,
            recentChanges: isPlanner ? [] : recentChanges,
        };
    }

    /**
     * Get descriptions of recently applied suggestions for context.
     */
    private static async getRecentChanges(ideaId: string): Promise<string[]> {
        try {
            const repo = IterationRepository.getInstance();
            const session = await repo.getSessionByIdeaId(ideaId);
            if (!session?.messages) return [];

            const changes: string[] = [];
            for (const msg of session.messages) {
                if (
                    msg.suggestion &&
                    (msg.suggestion.status === "applied" || msg.suggestion.status === "approved") &&
                    changes.length < MAX_APPLIED_SUGGESTIONS
                ) {
                    changes.push(`[${msg.suggestion.status}] ${msg.suggestion.title}: ${msg.suggestion.summary}`);
                }
            }
            return changes;
        } catch {
            return [];
        }
    }

    /**
     * Serialize context to string for prompt injection.
     * Structured format — more readable for LLM than raw JSON.
     */
    static serialize(ctx: ProjectContext): string {
        const parts: string[] = [];

        // Idea
        parts.push("## Project Idea");
        parts.push(`Status: ${ctx.idea.status}`);
        parts.push(`Description: ${ctx.idea.refinedText || ctx.idea.rawText}`);
        if (ctx.idea.analysisResult) {
            const analysis = typeof ctx.idea.analysisResult === "string"
                ? ctx.idea.analysisResult
                : JSON.stringify(ctx.idea.analysisResult);
            parts.push(`\nAnalysis & Reasoning:\n${analysis}`);
        }

        // Documents
        if (ctx.documents.length > 0) {
            parts.push("\n## Documents");
            for (const doc of ctx.documents) {
                parts.push(`### [${doc.type}] "${doc.title}" (id: ${doc.id})`);
                if (doc.contentPreview) {
                    parts.push(doc.contentPreview);
                }
            }
        }

        // Diagrams
        if (ctx.diagrams.length > 0) {
            parts.push("\n## Diagrams");
            for (const d of ctx.diagrams) {
                parts.push(`### [${d.type}] "${d.title}" (id: ${d.id})`);
                if (d.mermaidPreview) {
                    parts.push("```mermaid");
                    parts.push(d.mermaidPreview);
                    parts.push("```");
                }
            }
        }

        // Features + Tasks
        if (ctx.features.length > 0) {
            parts.push("\n## Features & Tasks");
            for (const f of ctx.features) {
                parts.push(`### Feature: "${f.title}" [${f.priority}/${f.status}] (id: ${f.id})`);
                parts.push(f.description);
                if (f.tasks.length > 0) {
                    for (const t of f.tasks) {
                        parts.push(`  - Task: "${t.title}" [${t.priority}/${t.status}] (id: ${t.id})`);
                        if (t.description) {
                            parts.push(`    ${t.description}`);
                        }
                    }
                }
            }
        }

        // Workflow
        if (ctx.workflow) {
            parts.push("\n## Workflow");
            parts.push(`Status: ${ctx.workflow.status}`);
            for (const s of ctx.workflow.steps) {
                parts.push(`- Step ${s.order}: "${s.title}" [${s.status}] (id: ${s.id})`);
                if (s.description) {
                    parts.push(`  Description: ${s.description}`);
                }
                if (s.instructions) {
                    parts.push(`  Instructions: ${s.instructions}`);
                }
            }
        }

        // Recent changes
        if (ctx.recentChanges.length > 0) {
            parts.push("\n## Recently Applied Changes");
            for (const c of ctx.recentChanges) {
                parts.push(`- ${c}`);
            }
        }

        return parts.join("\n");
    }
}

export { MAX_VERBATIM_HISTORY };
