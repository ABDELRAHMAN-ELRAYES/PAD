// ============================================
// Module 5: Workflow & AI IDE Integration Types
// ============================================

export type WorkflowStatus = "draft" | "active" | "completed";
export type WorkflowStepStatus = "pending" | "in_progress" | "completed" | "blocked" | "failed";

export interface WorkflowStepDependency {
    id: string;
    stepId: string;
    dependsOnStepId: string;
    createdAt: string;
    dependsOn?: WorkflowStep;
}

export interface WorkflowStep {
    id: string;
    workflowId: string;
    taskId: string | null;
    title: string;
    description: string;
    instructions: string;
    status: WorkflowStepStatus;
    order: number;
    createdAt: string;
    updatedAt: string;
    dependencies?: WorkflowStepDependency[];
}

export interface Workflow {
    id: string;
    ideaId: string;
    status: WorkflowStatus;
    createdAt: string;
    updatedAt: string;
    steps?: WorkflowStep[];
}

export interface WorkflowResponse {
    workflow: Workflow;
}

export interface UpdateWorkflowStepInput {
    title?: string;
    description?: string;
    instructions?: string;
    status?: WorkflowStepStatus;
    changelog?: string;
}

export interface WorkflowExportResponse {
    export: string;
}
