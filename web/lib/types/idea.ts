// Idea status type
export type IdeaStatus = "draft" | "confirmed";

// AI Analysis result schema
export interface IIdeaAnalysisResult {
    missingDetails: string[];
    complementarySuggestions: string[];
    constraintsAndRisks: string[];
    clarifyingQuestions: string[];
}

// Base idea entity interface
export interface Idea {
    id: string;
    rawText: string;
    refinedText: string | null;
    status: IdeaStatus;
    analysisResult: IIdeaAnalysisResult | null;
    createdAt: string;
    updatedAt: string;
}

// Input for creating a new idea
export interface CreateIdeaInput {
    rawText: string;
}

// Question and answer pair for clarifying questions
export interface IQuestionAnswer {
    question: string;
    answer: string;
}

// Input for refining an idea
export interface RefineIdeaInput {
    refinedText?: string;
    answers?: IQuestionAnswer[];
}

// API Response types
export interface ApiResponse<T> {
    status: "success" | "fail" | "error";
    message?: string;
    data?: T;
}

export interface IdeaResponse {
    idea: Idea;
}

export interface IdeasListResponse {
    ideas: Idea[];
    count: number;
}

// ============================================
// Document Types (Module 2)
// ============================================

export type DocumentType = "PRD" | "BRD";
export type DocumentStatus = "draft" | "published";

export interface Document {
    id: string;
    ideaId: string;
    type: DocumentType;
    title: string;
    content: string;
    status: DocumentStatus;
    createdAt: string;
    updatedAt: string;
}

export interface DocumentVersion {
    id: string;
    documentId: string;
    version: number;
    content: string;
    changelog: string | null;
    createdAt: string;
}

export interface DocumentWithVersions extends Document {
    versions: DocumentVersion[];
}

export interface UpdateDocumentInput {
    title?: string;
    content?: string;
    status?: DocumentStatus;
    changelog?: string;
}

export interface DocumentResponse {
    document: Document;
}

export interface DocumentsListResponse {
    documents: Document[];
    count: number;
}

export interface DocumentVersionsResponse {
    versions: DocumentVersion[];
    count: number;
}

export type ExportFormat = "markdown" | "html";

// ============================================
// Diagram Types (Module 3)
// ============================================

export type DiagramType = "ERD" | "SEQUENCE" | "SCHEMA" | "FLOWCHART";
export type DiagramStatus = "draft" | "published";

export interface Diagram {
    id: string;
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
    status: DiagramStatus;
    createdAt: string;
    updatedAt: string;
}

export interface DiagramVersion {
    id: string;
    diagramId: string;
    version: number;
    mermaidCode: string;
    changelog: string | null;
    createdAt: string;
}

export interface DiagramWithVersions extends Diagram {
    versions: DiagramVersion[];
}

export interface UpdateDiagramInput {
    title?: string;
    mermaidCode?: string;
    status?: DiagramStatus;
    changelog?: string;
}

//  ========================================
// Module 4: Feature & Task Management Types
// ========================================

export type FeatureSource = "auto" | "manual" | "ai_suggested";
export type FeatureStatus = "active" | "archived";
export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "planned" | "in_progress" | "completed" | "blocked";

export interface Feature {
    id: string;
    ideaId: string;
    title: string;
    description: string;
    source: FeatureSource;
    status: FeatureStatus;
    priority: Priority;
    createdAt: string;
    updatedAt: string;
}

export interface FeatureVersion {
    id: string;
    featureId: string;
    version: number;
    title: string;
    description: string;
    changelog: string | null;
    createdAt: string;
}

export interface Task {
    id: string;
    featureId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    estimatedEffort: string | null;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface TaskVersion {
    id: string;
    taskId: string;
    version: number;
    title: string;
    description: string;
    status: TaskStatus;
    changelog: string | null;
    createdAt: string;
}

export interface TaskDependency {
    id: string;
    taskId: string;
    dependsOnTaskId: string;
    createdAt: string;
}

// Input Types
export interface CreateFeatureInput {
    ideaId: string;
    title: string;
    description: string;
    source?: FeatureSource;
    priority?: Priority;
}

export interface UpdateFeatureInput {
    title?: string;
    description?: string;
    priority?: Priority;
    status?: FeatureStatus;
    changelog?: string;
}

export interface CreateTaskInput {
    featureId: string;
    title: string;
    description: string;
    priority?: Priority;
    estimatedEffort?: string;
    order?: number;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    priority?: Priority;
    status?: TaskStatus;
    estimatedEffort?: string;
    order?: number;
    changelog?: string;
}

// Response Types
export interface FeatureResponse {
    feature: Feature;
}

export interface FeaturesListResponse {
    features: Feature[];
    count: number;
}

export interface TaskResponse {
    task: Task;
}

export interface TasksListResponse {
    tasks: Task[];
    count: number;
}

export interface DiagramResponse {
    diagram: Diagram;
}

export interface DiagramsListResponse {
    diagrams: Diagram[];
    count: number;
}

export interface DiagramVersionsResponse {
    versions: DiagramVersion[];
    count: number;
}

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

// ============================================
// Module 6: Iteration & Chat-Based Updates Types
// ============================================

export type IterationSessionStatus = "active" | "closed";
export type SuggestionStatus = "pending" | "approved" | "rejected" | "applied";
export type SuggestionModule = "DOCUMENT" | "DIAGRAM" | "FEATURE" | "TASK" | "WORKFLOW";
export type SuggestionActionType = "CREATE" | "MODIFY" | "DELETE" | "REGENERATE";

export interface IterationSuggestionAction {
    id: string;
    suggestionId: string;
    module: SuggestionModule;
    targetId: string;
    actionType: SuggestionActionType;
    newContent?: string;
    createdAt: string;
}

export interface IterationSuggestion {
    id: string;
    messageId: string;
    title: string;
    summary: string;
    status: SuggestionStatus;
    actions?: IterationSuggestionAction[];
    createdAt: string;
    updatedAt: string;
}

export interface IterationMessage {
    id: string;
    sessionId: string;
    role: "user" | "assistant";
    content: string;
    suggestion?: IterationSuggestion;
    createdAt: string;
}

export interface IterationSession {
    id: string;
    ideaId: string;
    status: IterationSessionStatus;
    messages?: IterationMessage[];
    createdAt: string;
    updatedAt: string;
}

export interface IterationSessionResponse {
    session: IterationSession;
}

export interface IterationMessageResponse {
    message: IterationMessage;
}

export interface IterationSuggestionResponse {
    suggestion: IterationSuggestion;
}

export interface SendMessageInput {
    content: string;
}
