/**
 * SynchronizationEngine — Propagates changes downstream through artifact dependency graph.
 *
 * Dependency order: DOCUMENT → DIAGRAM → FEATURE → TASK → WORKFLOW
 *
 * After primary artifact update, determines if downstream artifacts need sync.
 * Generates sync actions queued at lower priority than user-initiated changes.
 * Detects conflicts (e.g., task referencing deleted feature).
 */

import PrismaClientSingleton from "@/data-server-clients/prisma-client";
import DiagramRepository from "../diagram/diagram.repository";
import FeatureRepository from "../feature/feature.repository";
import TaskRepository from "../task/task.repository";
import ArtifactUpdateEngine, { ActionInput, ActionResult } from "./artifact-update-engine";

// ── Types ───────────────────────────────────────────────────

export interface ChangeEvent {
    module: string;
    artifactId: string;
    changeType: "CREATE" | "MODIFY" | "DELETE" | "REGENERATE";
    changeSummary: string;
    ideaId: string;
}

export interface SyncAction {
    module: string;
    targetId: string;
    actionType: "MODIFY" | "REGENERATE" | "DELETE";
    reason: string;
    priority: "high" | "normal" | "low";
}

export interface Conflict {
    type: "orphan_reference" | "stale_content" | "missing_dependency";
    sourceModule: string;
    sourceId: string;
    targetModule: string;
    targetId: string;
    description: string;
    resolution: "auto_regenerate" | "auto_delete" | "block_notify" | "user_choice";
}

export interface SyncResult {
    syncedActions: ActionResult[];
    conflicts: Conflict[];
    skipped: string[];
}

// ── Dependency graph ────────────────────────────────────────

const DOWNSTREAM_MAP: Record<string, string[]> = {
    DOCUMENT: ["DIAGRAM", "FEATURE"],
    DIAGRAM: [],
    FEATURE: ["TASK"],
    TASK: ["WORKFLOW"],
    WORKFLOW: [],
};

// ── Engine ──────────────────────────────────────────────────

export default class SynchronizationEngine {
    /**
     * Analyze change event and return downstream sync actions + conflicts.
     * Does NOT execute — caller decides whether to apply.
     */
    static async analyzeImpact(event: ChangeEvent): Promise<{
        syncActions: SyncAction[];
        conflicts: Conflict[];
    }> {
        const syncActions: SyncAction[] = [];
        const conflicts: Conflict[] = [];

        const downstreamModules = DOWNSTREAM_MAP[event.module] || [];

        for (const downstream of downstreamModules) {
            const result = await this.analyzeDownstream(event, downstream);
            syncActions.push(...result.actions);
            conflicts.push(...result.conflicts);
        }

        return { syncActions, conflicts };
    }

    /**
     * Execute sync actions after primary change.
     * Collects conflicts and skips blocked actions.
     */
    static async synchronize(event: ChangeEvent): Promise<SyncResult> {
        const { syncActions, conflicts } = await this.analyzeImpact(event);

        // Filter out actions blocked by conflicts
        const blockedTargets = new Set(
            conflicts
                .filter(c => c.resolution === "block_notify" || c.resolution === "user_choice")
                .map(c => `${c.targetModule}:${c.targetId}`)
        );

        const executableActions: ActionInput[] = [];
        const skipped: string[] = [];

        for (const action of syncActions) {
            const key = `${action.module}:${action.targetId}`;
            if (blockedTargets.has(key)) {
                skipped.push(`${action.module}/${action.targetId}: blocked by conflict`);
                continue;
            }

            executableActions.push({
                module: action.module as any,
                targetId: action.targetId,
                actionType: action.actionType as any,
            });
        }

        // Execute non-blocked actions
        const result = executableActions.length > 0
            ? await ArtifactUpdateEngine.executeAll(executableActions, event.ideaId)
            : { results: [], modulesAffected: [], failedActions: [], status: "applied" as const };

        return {
            syncedActions: result.results,
            conflicts,
            skipped,
        };
    }

    // ── Downstream Analysis ─────────────────────────────────

    private static async analyzeDownstream(
        event: ChangeEvent,
        downstream: string
    ): Promise<{ actions: SyncAction[]; conflicts: Conflict[] }> {
        const actions: SyncAction[] = [];
        const conflicts: Conflict[] = [];

        switch (event.module) {
            case "DOCUMENT": {
                if (downstream === "DIAGRAM") {
                    await this.analyzeDiagramImpact(event, actions, conflicts);
                } else if (downstream === "FEATURE") {
                    await this.analyzeFeatureImpact(event, actions, conflicts);
                }
                break;
            }
            case "FEATURE": {
                if (downstream === "TASK") {
                    await this.analyzeTaskImpact(event, actions, conflicts);
                }
                break;
            }
            case "TASK": {
                if (downstream === "WORKFLOW") {
                    await this.analyzeWorkflowImpact(event, actions, conflicts);
                }
                break;
            }
        }

        return { actions, conflicts };
    }

    // ── Per-Module Impact Analysis ───────────────────────────

    private static async analyzeDiagramImpact(
        event: ChangeEvent,
        actions: SyncAction[],
        conflicts: Conflict[]
    ): Promise<void> {
        const diagrams = await DiagramRepository.getInstance().getDiagramsByIdeaId(event.ideaId);
        if (!diagrams || diagrams.length === 0) return;

        if (event.changeType === "DELETE") {
            // Document deleted — diagrams may reference stale content
            for (const diag of diagrams) {
                conflicts.push({
                    type: "stale_content",
                    sourceModule: "DOCUMENT",
                    sourceId: event.artifactId,
                    targetModule: "DIAGRAM",
                    targetId: diag.id,
                    description: `Diagram "${diag.title}" may reference deleted document content`,
                    resolution: "auto_regenerate",
                });
                actions.push({
                    module: "DIAGRAM",
                    targetId: diag.id,
                    actionType: "REGENERATE",
                    reason: "Source document deleted — diagram may be stale",
                    priority: "normal",
                });
            }
        } else if (event.changeType === "MODIFY") {
            // Document modified — diagrams may need update
            for (const diag of diagrams) {
                actions.push({
                    module: "DIAGRAM",
                    targetId: diag.id,
                    actionType: "REGENERATE",
                    reason: `Source document modified: ${event.changeSummary}`,
                    priority: "low",
                });
            }
        }
    }

    private static async analyzeFeatureImpact(
        event: ChangeEvent,
        actions: SyncAction[],
        conflicts: Conflict[]
    ): Promise<void> {
        const features = await FeatureRepository.getInstance().getFeaturesByIdeaId(event.ideaId);
        if (!features || features.length === 0) return;

        if (event.changeType === "DELETE") {
            // Source document deleted — features derived from it may be orphaned
            for (const feat of features) {
                if (feat.source === "auto") {
                    conflicts.push({
                        type: "stale_content",
                        sourceModule: "DOCUMENT",
                        sourceId: event.artifactId,
                        targetModule: "FEATURE",
                        targetId: feat.id,
                        description: `Feature "${feat.title}" was auto-extracted from deleted document`,
                        resolution: "user_choice",
                    });
                }
            }
        } else if (event.changeType === "MODIFY") {
            // Document changed — features may need re-evaluation
            for (const feat of features) {
                if (feat.source === "auto") {
                    actions.push({
                        module: "FEATURE",
                        targetId: feat.id,
                        actionType: "REGENERATE",
                        reason: `Source document modified: ${event.changeSummary}`,
                        priority: "low",
                    });
                }
            }
        }
    }

    private static async analyzeTaskImpact(
        event: ChangeEvent,
        actions: SyncAction[],
        conflicts: Conflict[]
    ): Promise<void> {
        const taskRepo = TaskRepository.getInstance();

        if (event.changeType === "DELETE") {
            // Feature deleted — tasks under it are orphaned
            const tasks = await taskRepo.getTasksByFeatureId(event.artifactId);
            for (const task of tasks) {
                conflicts.push({
                    type: "orphan_reference",
                    sourceModule: "FEATURE",
                    sourceId: event.artifactId,
                    targetModule: "TASK",
                    targetId: task.id,
                    description: `Task "${task.title}" belongs to deleted feature`,
                    resolution: "block_notify",
                });
            }
        } else if (event.changeType === "MODIFY") {
            // Feature modified — tasks may need update
            const tasks = await taskRepo.getTasksByFeatureId(event.artifactId);
            for (const task of tasks) {
                actions.push({
                    module: "TASK",
                    targetId: task.id,
                    actionType: "REGENERATE",
                    reason: `Parent feature modified: ${event.changeSummary}`,
                    priority: "low",
                });
            }
        }
    }

    private static async analyzeWorkflowImpact(
        event: ChangeEvent,
        _actions: SyncAction[],
        conflicts: Conflict[]
    ): Promise<void> {
        if (event.changeType === "DELETE") {
            // Task deleted — workflow steps referencing it are orphaned
            const prisma = PrismaClientSingleton.getPrismaClient();
            const steps = await prisma.workflowStep.findMany({
                where: { taskId: event.artifactId },
            });

            for (const step of steps) {
                conflicts.push({
                    type: "orphan_reference",
                    sourceModule: "TASK",
                    sourceId: event.artifactId,
                    targetModule: "WORKFLOW",
                    targetId: step.id,
                    description: `Workflow step "${step.title}" references deleted task`,
                    resolution: "block_notify",
                });
            }
        }
    }
}
