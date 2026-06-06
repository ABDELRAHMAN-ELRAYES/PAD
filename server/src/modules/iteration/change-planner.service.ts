/**
 * ChangePlannerService — Generates modification plans from user requests.
 *
 * Pipeline:
 *   1. Build targeted context (full project graph)
 *   2. Call AI with planner prompt
 *   3. Parse structured plan output
 *   4. Validate target IDs against DB
 *   5. Persist plan to ModificationPlan + ModificationPlanAction tables
 *   6. Return plan for user confirmation or auto-apply
 *
 * The planner NEVER writes artifacts — only produces plans consumed by ArtifactUpdateEngine.
 */

import PrismaClientSingleton from "@/data-server-clients/prisma-client";
import AiService from "../ai/ai.service";
import { buildChangePlannerPrompts, PlannerOutput, PlannedAction } from "../ai/prompts/change-planner.prompt";
import IterationContextBuilder from "./iteration-context.builder";
import IterationRepository from "./iteration.repository";
import DocumentRepository from "../document/document.repository";
import DiagramRepository from "../diagram/diagram.repository";
import FeatureRepository from "../feature/feature.repository";
import TaskRepository from "../task/task.repository";
import { workflowRepository } from "../workflow/workflow.repository";

// ── Types ───────────────────────────────────────────────────

export interface ModificationPlan {
    id: string;
    sessionId: string;
    userMessage: string;
    status: string;
    summary: string | null;
    explanation: string;
    actions: ModificationPlanAction[];
    requiresConfirmation: boolean;
    createdAt: Date;
}

export interface ModificationPlanAction {
    id: string;
    planId: string;
    module: string;
    targetId: string;
    actionType: string;
    newContent: string | null;
    status: string;
    error: string | null;
    rationale?: string;
}

export interface PlanValidationResult {
    valid: boolean;
    warnings: string[];
    invalidActions: string[];
}

// ── Module ordering for dependency-aware apply ──────────────

const MODULE_ORDER: Record<string, number> = {
    DOCUMENT: 0,
    DIAGRAM: 1,
    FEATURE: 2,
    TASK: 3,
    WORKFLOW: 4,
};

function sortActionsByDependency(actions: PlannedAction[]): PlannedAction[] {
    return [...actions].sort((a, b) => {
        const aIsDelete = a.actionType === "DELETE" ? 1 : 0;
        const bIsDelete = b.actionType === "DELETE" ? 1 : 0;

        // DELETEs go last, in reverse module order
        if (aIsDelete !== bIsDelete) return aIsDelete - bIsDelete;
        if (aIsDelete && bIsDelete) {
            return (MODULE_ORDER[b.module] || 0) - (MODULE_ORDER[a.module] || 0);
        }

        // Non-deletes: upstream modules first
        return (MODULE_ORDER[a.module] || 0) - (MODULE_ORDER[b.module] || 0);
    });
}

// ── Service ─────────────────────────────────────────────────

export default class ChangePlannerService {
    /**
     * Generate a modification plan from user message.
     * Does NOT apply changes — returns plan for review.
     */
    static async generatePlan(
        ideaId: string,
        sessionId: string,
        userMessage: string
    ): Promise<ModificationPlan> {
        const prisma = PrismaClientSingleton.getPrismaClient();

        // 1. Build full project context
        const context = await IterationContextBuilder.buildPlannerContext(ideaId, userMessage);
        const contextStr = IterationContextBuilder.serialize(context);

        // 2. Get conversation history
        const repo = IterationRepository.getInstance();
        const messages = await repo.getMessagesBySessionId(sessionId);
        const history = messages.map(m => ({
            role: m.role,
            content: m.content,
        }));

        const plannerSchema = {
            type: "object",
            properties: {
                summary: { type: "string" },
                explanation: { type: "string" },
                affectedArtifacts: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            module: { type: "string" },
                            targetId: { type: "string" },
                            actionType: { type: "string" },
                            rationale: { type: "string" },
                            newContent: { type: "string" }
                        },
                        required: ["module", "targetId", "actionType", "rationale", "newContent"]
                    }
                },
                dependencyOrder: {
                    type: "array",
                    items: { type: "string" }
                },
                estimatedActions: { type: "integer" },
                requiresConfirmation: { type: "boolean" }
            },
            required: ["summary", "explanation", "affectedArtifacts", "dependencyOrder", "estimatedActions", "requiresConfirmation"]
        };

        const prompts = buildChangePlannerPrompts(contextStr, history, userMessage);
        const aiResponse = await AiService.callLLM(prompts.userPrompt, plannerSchema, prompts.systemPrompt);

        // 4. Parse plan output
        let plannerOutput: PlannerOutput;
        try {
            plannerOutput = AiService.robustJSONParse<PlannerOutput>(aiResponse);
        } catch (e) {
            console.error("[ChangePlanner] Failed to parse AI plan output:", e);
            // Fallback: create minimal plan
            plannerOutput = {
                summary: "Unable to generate detailed plan. Please try rephrasing your request.",
                explanation: aiResponse.substring(0, 500),
                affectedArtifacts: [],
                dependencyOrder: [],
                estimatedActions: 0,
                requiresConfirmation: true,
            };
        }

        // 5. Filter out malformed actions and sort by dependency order
        const rawActions = Array.isArray(plannerOutput.affectedArtifacts) ? plannerOutput.affectedArtifacts : [];
        const validFormatActions = rawActions.filter(a => 
            a && typeof a === 'object' && 
            typeof a.module === 'string' && 
            typeof a.targetId === 'string' && 
            typeof a.actionType === 'string'
        ) as PlannedAction[];
        
        const sortedActions = sortActionsByDependency(validFormatActions);

        // 6. Validate target IDs
        const validation = await this.validatePlan(sortedActions);

        // 7. Persist plan to DB
        const dbPlan = await prisma.modificationPlan.create({
            data: {
                sessionId,
                userMessage,
                status: "draft",
                summary: plannerOutput.summary || null,
                actions: {
                    create: sortedActions.map((action, i) => {
                        const isInvalid = validation.invalidActions.includes(String(i));
                        return {
                            module: action.module,
                            targetId: action.targetId,
                            actionType: action.actionType,
                            newContent: action.newContent || null,
                            status: isInvalid ? "failed" : "pending",
                            error: isInvalid ? `Target "${action.targetId}" not found` : null,
                        };
                    }),
                },
            },
            include: {
                actions: true,
            },
        });

        // 8. Build response
        return {
            id: dbPlan.id,
            sessionId: dbPlan.sessionId,
            userMessage: dbPlan.userMessage,
            status: dbPlan.status,
            summary: dbPlan.summary,
            explanation: plannerOutput.explanation || "",
            actions: dbPlan.actions.map((a, i) => ({
                ...a,
                rationale: sortedActions[i]?.rationale,
            })),
            requiresConfirmation: plannerOutput.requiresConfirmation ?? true,
            createdAt: dbPlan.createdAt,
        };
    }

    /**
     * Get an existing plan by ID.
     */
    static async getPlan(planId: string): Promise<ModificationPlan | null> {
        const prisma = PrismaClientSingleton.getPrismaClient();
        const plan = await prisma.modificationPlan.findUnique({
            where: { id: planId },
            include: { actions: true },
        });

        if (!plan) return null;

        return {
            id: plan.id,
            sessionId: plan.sessionId,
            userMessage: plan.userMessage,
            status: plan.status,
            summary: plan.summary,
            explanation: "",
            actions: plan.actions,
            requiresConfirmation: plan.status === "draft",
            createdAt: plan.createdAt,
        };
    }

    /**
     * Confirm and execute a plan via ArtifactUpdateEngine.
     * Updates plan status through lifecycle: confirmed → applying → applied/failed.
     */
    static async confirmPlan(planId: string, ideaId: string): Promise<ModificationPlan> {
        const prisma = PrismaClientSingleton.getPrismaClient();

        // Load plan
        const plan = await prisma.modificationPlan.findUnique({
            where: { id: planId },
            include: { actions: true },
        });

        if (!plan) throw new Error("Plan not found");
        if (plan.status !== "draft" && plan.status !== "confirmed") {
            throw new Error(`Plan cannot be confirmed — current status: ${plan.status}`);
        }

        // Update to confirmed → applying
        await prisma.modificationPlan.update({
            where: { id: planId },
            data: { status: "applying" },
        });

        // Import here to avoid circular dep at module level
        const { default: ArtifactUpdateEngine } = await import("./artifact-update-engine");

        // Execute actions via ArtifactUpdateEngine
        const actionInputs = plan.actions.map(a => ({
            module: a.module as any,
            targetId: a.targetId,
            actionType: a.actionType as any,
            newContent: a.newContent || undefined,
        }));

        const result = await ArtifactUpdateEngine.executeAll(actionInputs, ideaId);

        // Update individual action statuses
        for (let i = 0; i < plan.actions.length && i < result.results.length; i++) {
            const actionResult = result.results[i];
            await prisma.modificationPlanAction.update({
                where: { id: plan.actions[i].id },
                data: {
                    status: actionResult.success ? "applied" : "failed",
                    error: actionResult.error || null,
                    artifactVersionId: actionResult.artifactId || null,
                },
            });
        }

        // Update plan status
        const finalStatus = result.status === "applied" ? "applied" : "failed";
        const updated = await prisma.modificationPlan.update({
            where: { id: planId },
            data: {
                status: finalStatus,
                appliedAt: finalStatus === "applied" ? new Date() : null,
            },
            include: { actions: true },
        });

        return {
            id: updated.id,
            sessionId: updated.sessionId,
            userMessage: updated.userMessage,
            status: updated.status,
            summary: updated.summary,
            explanation: "",
            actions: updated.actions,
            requiresConfirmation: false,
            createdAt: updated.createdAt,
        };
    }

    /**
     * Get change history for an idea.
     */
    static async getChangeHistory(ideaId: string): Promise<ModificationPlan[]> {
        const prisma = PrismaClientSingleton.getPrismaClient();

        // Get session for idea
        const repo = IterationRepository.getInstance();
        const session = await repo.getSessionByIdeaId(ideaId);
        if (!session) return [];

        const plans = await prisma.modificationPlan.findMany({
            where: { sessionId: session.id },
            include: { actions: true },
            orderBy: { createdAt: "desc" },
        });

        return plans.map(plan => ({
            id: plan.id,
            sessionId: plan.sessionId,
            userMessage: plan.userMessage,
            status: plan.status,
            summary: plan.summary,
            explanation: "",
            actions: plan.actions,
            requiresConfirmation: plan.status === "draft",
            createdAt: plan.createdAt,
        }));
    }

    /**
     * Rollback a plan — revert all applied actions in reverse order.
     * Uses existing revertToVersion APIs for documents/diagrams.
     * For features/tasks/workflows, uses change records to find previous versions.
     */
    static async rollbackPlan(planId: string): Promise<ModificationPlan> {
        const prisma = PrismaClientSingleton.getPrismaClient();

        const plan = await prisma.modificationPlan.findUnique({
            where: { id: planId },
            include: {
                actions: true,
                changeRecords: true,
            },
        });

        if (!plan) throw new Error("Plan not found");
        if (plan.status !== "applied" && plan.status !== "failed") {
            throw new Error(`Plan cannot be rolled back — current status: ${plan.status}`);
        }

        const rollbackErrors: string[] = [];

        // Revert in reverse order (downstream first)
        const appliedActions = plan.actions
            .filter(a => a.status === "applied")
            .reverse();

        for (const action of appliedActions) {
            try {
                // Find change record for version info
                const changeRecord = plan.changeRecords.find(
                    cr => cr.module === action.module && cr.artifactId === action.targetId
                );

                if (action.actionType === "CREATE" && action.artifactVersionId) {
                    // Revert CREATE = delete created artifact
                    await this.deleteArtifact(action.module, action.artifactVersionId);
                } else if (action.actionType === "MODIFY" && changeRecord?.fromVersion != null) {
                    // Revert MODIFY = restore previous version
                    await this.revertArtifact(action.module, action.targetId, changeRecord.fromVersion);
                } else if (action.actionType === "DELETE") {
                    // Cannot undo DELETE without stored content — log warning
                    rollbackErrors.push(`${action.module}/${action.targetId}: DELETE cannot be undone`);
                }
                // REGENERATE = revert to previous version if available
                else if (action.actionType === "REGENERATE" && changeRecord?.fromVersion != null) {
                    await this.revertArtifact(action.module, action.targetId, changeRecord.fromVersion);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                rollbackErrors.push(`${action.module}/${action.targetId}: ${msg}`);
            }
        }

        // Update plan status
        const finalStatus = rollbackErrors.length === 0 ? "rolled_back" : "failed";
        const updated = await prisma.modificationPlan.update({
            where: { id: planId },
            data: { status: finalStatus },
            include: { actions: true },
        });

        return {
            id: updated.id,
            sessionId: updated.sessionId,
            userMessage: updated.userMessage,
            status: updated.status,
            summary: updated.summary,
            explanation: rollbackErrors.length > 0
                ? `Rollback partial. Errors: ${rollbackErrors.join("; ")}`
                : "All changes reverted.",
            actions: updated.actions,
            requiresConfirmation: false,
            createdAt: updated.createdAt,
        };
    }

    // ── Rollback Helpers ────────────────────────────────────

    private static async deleteArtifact(module: string, artifactId: string): Promise<void> {
        switch (module) {
            case "DOCUMENT":
                await DocumentRepository.getInstance().deleteDocument(artifactId);
                break;
            case "DIAGRAM":
                await DiagramRepository.getInstance().deleteDiagram(artifactId);
                break;
            case "FEATURE": {
                const throwNext = (err: any) => { if (err) throw err; };
                const { default: FeatureService } = await import("../feature/feature.service");
                await FeatureService.deleteFeature(artifactId, throwNext);
                break;
            }
            case "TASK": {
                const throwNext = (err: any) => { if (err) throw err; };
                const { default: TaskService } = await import("../task/task.service");
                await TaskService.deleteTask(artifactId, throwNext);
                break;
            }
            case "WORKFLOW": {
                const prisma = PrismaClientSingleton.getPrismaClient();
                await prisma.workflowStep.delete({ where: { id: artifactId } });
                break;
            }
        }
    }

    private static async revertArtifact(module: string, artifactId: string, version: number): Promise<void> {
        const throwNext = (err: any) => { if (err) throw err; };
        switch (module) {
            case "DOCUMENT": {
                const { default: DocumentService } = await import("../document/document.service");
                await DocumentService.revertToVersion(artifactId, version, throwNext);
                break;
            }
            case "DIAGRAM": {
                // Diagram revert — load version content, update diagram
                const prisma = PrismaClientSingleton.getPrismaClient();
                const ver = await prisma.diagramVersion.findFirst({
                    where: { diagramId: artifactId, version },
                });
                if (ver) {
                    const { default: DiagramService } = await import("../diagram/diagram.service");
                    await DiagramService.updateDiagram(artifactId, {
                        mermaidCode: ver.mermaidCode,
                        changelog: `Rolled back to version ${version}`,
                    }, throwNext);
                }
                break;
            }
            case "FEATURE": {
                const prisma = PrismaClientSingleton.getPrismaClient();
                const ver = await prisma.featureVersion.findFirst({
                    where: { featureId: artifactId, version },
                });
                if (ver) {
                    const { default: FeatureService } = await import("../feature/feature.service");
                    await FeatureService.updateFeature(artifactId, {
                        title: ver.title,
                        description: ver.description,
                        changelog: `Rolled back to version ${version}`,
                    }, throwNext);
                }
                break;
            }
            case "TASK": {
                const prisma = PrismaClientSingleton.getPrismaClient();
                const ver = await prisma.taskVersion.findFirst({
                    where: { taskId: artifactId, version },
                });
                if (ver) {
                    const { default: TaskService } = await import("../task/task.service");
                    await TaskService.updateTask(artifactId, {
                        title: ver.title,
                        description: ver.description,
                        status: ver.status as any,
                        changelog: `Rolled back to version ${version}`,
                    }, throwNext);
                }
                break;
            }
        }
    }

    // ── Validation ──────────────────────────────────────────

    /**
     * Validate planned actions — check target IDs exist.
     */
    private static async validatePlan(actions: PlannedAction[]): Promise<PlanValidationResult> {
        const warnings: string[] = [];
        const invalidActions: string[] = [];

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];

            // CREATE actions don't need target validation
            if (action.actionType === "CREATE") continue;

            // Skip if targetId is "new" (shouldn't be for MODIFY/DELETE but be safe)
            if (!action.targetId || action.targetId === "new") {
                warnings.push(`Action ${i}: ${action.module} ${action.actionType} has no valid targetId`);
                invalidActions.push(String(i));
                continue;
            }

            const exists = await this.targetExists(action.module, action.targetId);
            if (!exists) {
                warnings.push(`Action ${i}: ${action.module} target "${action.targetId}" not found`);
                invalidActions.push(String(i));
            }
        }

        return {
            valid: invalidActions.length === 0,
            warnings,
            invalidActions,
        };
    }

    private static async targetExists(module: string, targetId: string): Promise<boolean> {
        try {
            switch (module) {
                case "DOCUMENT":
                    return !!(await DocumentRepository.getInstance().getDocumentById(targetId));
                case "DIAGRAM":
                    return !!(await DiagramRepository.getInstance().getDiagramById(targetId));
                case "FEATURE":
                    return !!(await FeatureRepository.getInstance().getFeatureById(targetId));
                case "TASK":
                    return !!(await TaskRepository.getInstance().getTaskById(targetId));
                case "WORKFLOW":
                    return !!(await workflowRepository.getWorkflowStepById(targetId));
                default:
                    return false;
            }
        } catch {
            return false;
        }
    }
}
