/**
 * ArtifactUpdateEngine — Extracted from IterationService.applyAction.
 *
 * Responsibilities:
 *   1. Pre-validate target IDs before write
 *   2. Route actions to correct service methods (including REGENERATE)
 *   3. Collect per-action results (success/fail)
 *   4. Never throw — returns structured results
 */

import DocumentRepository from "../document/document.repository";
import DocumentService from "../document/document.service";
import DiagramRepository from "../diagram/diagram.repository";
import DiagramService from "../diagram/diagram.service";
import FeatureRepository from "../feature/feature.repository";
import FeatureService from "../feature/feature.service";
import TaskService from "../task/task.service";
import { workflowRepository } from "../workflow/workflow.repository";
import { WorkflowService } from "../workflow/workflow.service";
import PrismaClientSingleton from "@/data-server-clients/prisma-client";
import { DocumentType } from "../document/types/IDocument";
import { DiagramType } from "../diagram/types/IDiagram";
import { Priority, TaskStatus } from "../task/types/ITask";
import { WorkflowStepStatus } from "../workflow/types/IWorkflow";
import { parseNestedJson, validateContentForModule } from "@/utils/content-parser";
import SynchronizationEngine, { ChangeEvent } from "./synchronization-engine";

// ── Types ───────────────────────────────────────────────────

export interface ActionInput {
    module: "DOCUMENT" | "DIAGRAM" | "FEATURE" | "TASK" | "WORKFLOW";
    targetId: string;
    actionType: "CREATE" | "MODIFY" | "DELETE" | "REGENERATE";
    newContent?: string;
    featureId?: string; // For TASK CREATE — explicit feature association
}

export interface ActionResult {
    success: boolean;
    module: string;
    actionType: string;
    targetId: string;
    artifactId?: string;
    error?: string;
}

export type ApplyStatus = "applied" | "partial" | "failed";

export interface ApplyResult {
    status: ApplyStatus;
    results: ActionResult[];
    modulesAffected: string[];
    failedActions: string[];
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Dummy NextFunction for services that require it.
 * Converts next(error) into a thrown error for our catch boundary.
 */
const throwingNext = (err: any) => {
    if (err) throw err;
};

// ── Engine ──────────────────────────────────────────────────

export default class ArtifactUpdateEngine {
    /**
     * Execute a batch of actions in sequence.
     * Each action is independently caught — partial success is possible.
     */
    static async executeAll(actions: ActionInput[], ideaId: string): Promise<ApplyResult> {
        const results: ActionResult[] = [];
        const modulesAffected: string[] = [];
        const failedActions: string[] = [];

        for (const action of actions) {
            const result = await this.executeAction(action, ideaId);
            results.push(result);

            if (result.success) {
                modulesAffected.push(result.module);
            } else {
                failedActions.push(`${result.module}/${result.actionType}: ${result.error}`);
            }
        }

        let status: ApplyStatus;
        if (failedActions.length === 0) {
            status = "applied";
        } else if (modulesAffected.length > 0) {
            status = "partial";
        } else {
            status = "failed";
        }

        // Trigger downstream sync for successful actions (background, non-blocking)
        for (const result of results) {
            if (result.success && result.artifactId) {
                const action = actions.find(
                    a => a.module === result.module && a.actionType === result.actionType
                );
                if (action) {
                    const event: ChangeEvent = {
                        module: result.module,
                        artifactId: result.artifactId,
                        changeType: action.actionType as ChangeEvent["changeType"],
                        changeSummary: `${action.actionType} via AME`,
                        ideaId,
                    };
                    // Fire-and-forget sync — log errors but don't fail primary apply
                    SynchronizationEngine.synchronize(event).catch(err => {
                        console.error(`[ArtifactUpdateEngine] Background sync failed for ${result.module}:`, err);
                    });
                }
            }
        }

        return {
            status,
            results,
            modulesAffected: [...new Set(modulesAffected)],
            failedActions,
        };
    }

    /**
     * Execute a single action. Never throws — wraps errors into ActionResult.
     */
    static async executeAction(action: ActionInput, ideaId: string): Promise<ActionResult> {
        const base: Omit<ActionResult, "success" | "error" | "artifactId"> = {
            module: action.module,
            actionType: action.actionType,
            targetId: action.targetId,
        };

        try {
            // Pre-validate target exists for MODIFY/DELETE/REGENERATE
            if (action.actionType !== "CREATE") {
                const validationError = await this.validateTarget(action);
                if (validationError) {
                    return { ...base, success: false, error: validationError };
                }
            }

            // Validate content is appropriate for module
            const contentError = validateContentForModule(action.module, action.actionType, action.newContent);
            if (contentError) {
                return { ...base, success: false, error: contentError };
            }

            const artifactId = await this.route(action, ideaId);
            return { ...base, success: true, artifactId };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            console.error(`[ArtifactUpdateEngine] Failed ${action.module}/${action.actionType}:`, message);
            return { ...base, success: false, error: message };
        }
    }

    // ── Target Validation ───────────────────────────────────

    /**
     * Verify target artifact exists before MODIFY/DELETE/REGENERATE.
     * Returns error string if invalid, undefined if valid.
     */
    private static async validateTarget(action: ActionInput): Promise<string | undefined> {
        const { module, targetId, actionType } = action;
        if (!targetId || targetId === "new") {
            return `${module} ${actionType} requires a valid targetId, got "${targetId}"`;
        }

        try {
            switch (module) {
                case "DOCUMENT": {
                    const doc = await DocumentRepository.getInstance().getDocumentById(targetId);
                    if (!doc) return `Document "${targetId}" not found`;
                    break;
                }
                case "DIAGRAM": {
                    const diag = await DiagramRepository.getInstance().getDiagramById(targetId);
                    if (!diag) return `Diagram "${targetId}" not found`;
                    break;
                }
                case "FEATURE": {
                    const feat = await FeatureRepository.getInstance().getFeatureById(targetId);
                    if (!feat) return `Feature "${targetId}" not found`;
                    break;
                }
                case "TASK": {
                    const task = await TaskService.getTask(targetId, throwingNext);
                    if (!task) return `Task "${targetId}" not found`;
                    break;
                }
                case "WORKFLOW": {
                    const step = await workflowRepository.getWorkflowStepById(targetId);
                    if (!step) return `Workflow step "${targetId}" not found`;
                    break;
                }
            }
        } catch {
            return `${module} target "${targetId}" validation failed`;
        }

        return undefined;
    }

    // ── Action Routing ──────────────────────────────────────

    /**
     * Route action to correct service method. Returns created/updated artifact ID.
     */
    private static async route(action: ActionInput, ideaId: string): Promise<string | undefined> {
        const parsed = parseNestedJson(action.newContent);

        switch (action.module) {
            case "DOCUMENT":
                return this.routeDocument(action, ideaId, parsed);
            case "DIAGRAM":
                return this.routeDiagram(action, ideaId, parsed);
            case "FEATURE":
                return this.routeFeature(action, ideaId, parsed);
            case "TASK":
                return this.routeTask(action, ideaId, parsed);
            case "WORKFLOW":
                return this.routeWorkflow(action, ideaId, parsed);
            default:
                throw new Error(`Unknown module: ${action.module}`);
        }
    }

    // ── Per-Module Routing ──────────────────────────────────

    private static async routeDocument(
        action: ActionInput,
        ideaId: string,
        parsed: Record<string, any>
    ): Promise<string | undefined> {
        const docRepo = DocumentRepository.getInstance();

        switch (action.actionType) {
            case "CREATE": {
                const doc = await docRepo.createDocument({
                    ideaId,
                    type: (parsed.type || "PRD") as DocumentType,
                    title: parsed.title || "New Document",
                    content: parsed.content || "",
                });
                return doc.id;
            }
            case "MODIFY": {
                await DocumentService.updateDocument(action.targetId, {
                    title: parsed.title,
                    content: parsed.content,
                    changelog: "AI Applied Iteration",
                }, throwingNext);
                return action.targetId;
            }
            case "REGENERATE": {
                // Proper REGENERATE — calls AI to regenerate full document
                await DocumentService.regenerateDocument(action.targetId, throwingNext);
                return action.targetId;
            }
            case "DELETE": {
                await docRepo.deleteDocument(action.targetId);
                return action.targetId;
            }
        }
    }

    private static async routeDiagram(
        action: ActionInput,
        ideaId: string,
        parsed: Record<string, any>
    ): Promise<string | undefined> {
        const diagRepo = DiagramRepository.getInstance();

        switch (action.actionType) {
            case "CREATE": {
                const diag = await diagRepo.createDiagram({
                    ideaId,
                    type: (parsed.type || "ERD") as DiagramType,
                    title: parsed.title || "New Diagram",
                    mermaidCode: parsed.content || "",
                });
                return diag.id;
            }
            case "MODIFY": {
                await DiagramService.updateDiagram(action.targetId, {
                    title: parsed.title,
                    mermaidCode: parsed.content,
                    changelog: "AI Applied Iteration",
                }, throwingNext);
                return action.targetId;
            }
            case "REGENERATE": {
                // Proper REGENERATE — calls AI to regenerate diagram
                await DiagramService.regenerateDiagram(action.targetId, throwingNext);
                return action.targetId;
            }
            case "DELETE": {
                await diagRepo.deleteDiagram(action.targetId);
                return action.targetId;
            }
        }
    }

    private static async routeFeature(
        action: ActionInput,
        ideaId: string,
        parsed: Record<string, any>
    ): Promise<string | undefined> {
        switch (action.actionType) {
            case "CREATE": {
                let title = parsed.title || (action.targetId && action.targetId !== "new" ? action.targetId : "New Feature");
                let description = parsed.content || "";
                if (description.length < 10) {
                    description = `Automated feature implementation for ${title}. ${description}`.trim();
                }

                const feature = await FeatureService.createFeature(ideaId, {
                    title,
                    description,
                    source: "auto",
                    priority: parsed.priority || "medium",
                }, throwingNext);
                return feature ? (feature as any).id : undefined;
            }
            case "MODIFY":
            case "REGENERATE": {
                // REGENERATE for features = re-extract from docs (future).
                // For now, treat as MODIFY with provided content.
                await FeatureService.updateFeature(action.targetId, {
                    title: parsed.title,
                    description: parsed.content,
                    priority: parsed.priority,
                    status: parsed.status,
                    changelog: "AI Applied Iteration",
                }, throwingNext);
                return action.targetId;
            }
            case "DELETE": {
                await FeatureService.deleteFeature(action.targetId, throwingNext);
                return action.targetId;
            }
        }
    }

    private static async routeTask(
        action: ActionInput,
        ideaId: string,
        parsed: Record<string, any>
    ): Promise<string | undefined> {
        switch (action.actionType) {
            case "CREATE": {
                // Resolve featureId
                let featureId = action.featureId || parsed.featureId;
                if (!featureId || featureId === "new") {
                    const features = await FeatureRepository.getInstance().getFeaturesByIdeaId(ideaId);
                    if (features.length > 0) {
                        featureId = features[0].id;
                    } else {
                        const newFeature = await FeatureService.createFeature(ideaId, {
                            title: "General",
                            description: "Iteration created task container.",
                            source: "auto",
                        }, throwingNext);
                        if (newFeature) featureId = (newFeature as any).id;
                    }
                }
                if (!featureId) throw new Error("Could not resolve featureId for task creation");

                let title = parsed.title || action.targetId || "New Task";
                let description = parsed.content || "";
                if (description.length < 10) {
                    description = `Automated task implementation for ${title}. ${description}`.trim();
                }

                const task = await TaskService.createTask(featureId, {
                    title,
                    description,
                    priority: (parsed.priority || "medium") as Priority,
                    estimatedEffort: parsed.estimatedEffort,
                    order: parsed.order || 0,
                }, throwingNext);
                return task ? (task as any).id : undefined;
            }
            case "MODIFY":
            case "REGENERATE": {
                await TaskService.updateTask(action.targetId, {
                    title: parsed.title,
                    description: parsed.content,
                    priority: parsed.priority as Priority,
                    status: parsed.status as TaskStatus,
                    changelog: "AI Applied Iteration",
                }, throwingNext);
                return action.targetId;
            }
            case "DELETE": {
                await TaskService.deleteTask(action.targetId, throwingNext);
                return action.targetId;
            }
        }
    }

    private static async routeWorkflow(
        action: ActionInput,
        ideaId: string,
        parsed: Record<string, any>
    ): Promise<string | undefined> {
        const prisma = PrismaClientSingleton.getPrismaClient();

        switch (action.actionType) {
            case "CREATE": {
                const workflow = await workflowRepository.getWorkflowByIdeaId(ideaId);
                if (!workflow) throw new Error("No workflow found for this idea");

                const steps = await workflowRepository.getWorkflowStepsByWorkflowId(workflow.id);
                let title = parsed.title || (action.targetId && action.targetId !== "new" ? action.targetId : "New Step");
                let description = parsed.content || "";
                if (description.length < 10) {
                    description = `Automated workflow step for ${title}. ${description}`.trim();
                }

                const step = await prisma.workflowStep.create({
                    data: {
                        workflowId: workflow.id,
                        title,
                        description,
                        instructions: parsed.instructions || "",
                        order: steps.length + 1,
                        status: (parsed.status || "pending") as WorkflowStepStatus,
                    },
                });
                return step.id;
            }
            case "MODIFY":
            case "REGENERATE": {
                await WorkflowService.updateWorkflowStep(action.targetId, {
                    title: parsed.title,
                    description: parsed.description,
                    instructions: parsed.instructions || parsed.content,
                    status: parsed.status as WorkflowStepStatus,
                    changelog: "AI Applied Iteration",
                }, throwingNext);
                return action.targetId;
            }
            case "DELETE": {
                await prisma.workflowStep.delete({
                    where: { id: action.targetId },
                });
                return action.targetId;
            }
        }
    }
}
