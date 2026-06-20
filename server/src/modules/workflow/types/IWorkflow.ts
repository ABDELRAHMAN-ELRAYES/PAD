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

// ============================================================
// Handoff Package Types
// ============================================================

export type HandoffPackageStatus = "draft" | "generating" | "ready" | "failed";
export type HandoffArtifactFileType = "markdown" | "mermaid" | "json";

export interface IHandoffArtifact {
    id: string;
    packageId: string;
    filePath: string;
    title: string;
    content: string;
    fileType: HandoffArtifactFileType;
    createdAt: Date;
    updatedAt: Date;
    versions?: IHandoffArtifactVersion[];
}

export interface IHandoffArtifactVersion {
    id: string;
    artifactId: string;
    version: number;
    content: string;
    changelog?: string | null;
    createdAt: Date;
}

export interface IHandoffPackage {
    id: string;
    ideaId: string;
    version: number;
    status: HandoffPackageStatus;
    zipPath?: string | null;
    createdAt: Date;
    updatedAt: Date;
    artifacts?: IHandoffArtifact[];
}

// SSE event payload shapes
export interface IHandoffProgressEvent {
    step: string;
    percent: number;
}

export interface IHandoffLogEvent {
    message: string;
}

export interface IHandoffCompleteEvent {
    packageId: string;
    version: number;
}

export interface IUpdateArtifactData {
    content: string;
    changelog?: string;
}
