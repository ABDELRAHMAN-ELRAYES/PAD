export type WorkflowStatus = "draft" | "active" | "completed";
export type WorkflowStepStatus = "pending" | "in_progress" | "completed" | "blocked" | "failed";

export interface IWorkflowStepVersion {
    id: string;
    stepId: string;
    version: number;
    title: string;
    description: string;
    instructions: string;
    status: WorkflowStepStatus;
    changelog?: string | null;
    createdAt: Date;
}

export interface IWorkflowStepDependency {
    id: string;
    stepId: string;
    dependsOnStepId: string;
    createdAt: Date;
    dependsOn?: IWorkflowStep;
}

export interface IWorkflowStep {
    id: string;
    workflowId: string;
    taskId?: string | null;
    title: string;
    description: string;
    instructions: string;
    status: WorkflowStepStatus;
    order: number;
    createdAt: Date;
    updatedAt: Date;

    // Optional relations
    dependencies?: IWorkflowStepDependency[];
    dependents?: IWorkflowStepDependency[];
    versions?: IWorkflowStepVersion[];
    task?: any; // We'll type this broadly to avoid circular dependencies if needed
}

export interface IWorkflow {
    id: string;
    ideaId: string;
    status: WorkflowStatus;
    createdAt: Date;
    updatedAt: Date;

    // Optional relations
    steps?: IWorkflowStep[];
    idea?: any;
}

// Data Transfer Objects (DTOs)

export interface IUpdateWorkflowStepData {
    title?: string;
    description?: string;
    instructions?: string;
    status?: WorkflowStepStatus;
    changelog?: string; // Reason for update
}

// AI Generation Output Types
export interface IGeneratedWorkflowStep {
    taskId?: string; // The original task this maps to (can be null if it's a new intermediate step)
    title: string;
    description: string;
    instructions: string;
    order: number;
    dependsOnTaskIds?: string[]; // Used during creation to map dependencies
}
