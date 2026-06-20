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

// ============================================================
// Handoff Package Types (Module 5 Redesign)
// ============================================================

export type HandoffPackageStatus = "draft" | "generating" | "ready" | "failed";
export type HandoffArtifactFileType = "markdown" | "mermaid" | "json";

export interface HandoffArtifact {
    id: string;
    packageId: string;
    filePath: string;
    title: string;
    fileType: HandoffArtifactFileType;
    createdAt: string;
    updatedAt: string;
    // content only present when fetched individually
    content?: string;
}

export interface HandoffPackage {
    id: string;
    ideaId: string;
    version: number;
    status: HandoffPackageStatus;
    zipPath?: string | null;
    createdAt: string;
    updatedAt: string;
    artifacts?: HandoffArtifact[];
}

export interface HandoffPackageResponse {
    package: HandoffPackage | null;
}

export interface HandoffArtifactResponse {
    artifact: HandoffArtifact & { content: string };
}

export interface UpdateArtifactInput {
    content: string;
    changelog?: string;
}

// SSE Event Types
export interface HandoffProgressEvent {
    step: string;
    percent: number;
}

export interface HandoffLogEvent {
    message: string;
}

export interface HandoffCompleteEvent {
    packageId: string;
    version: number;
}

export interface HandoffState {
    activeFileId: string | null;
    expandedNodes: Record<string, boolean>;
    compileProgress: number;
    compileLogs: string[];
    isCompiling: boolean;
    isEditing: boolean;
    localFileContent: string;
}
