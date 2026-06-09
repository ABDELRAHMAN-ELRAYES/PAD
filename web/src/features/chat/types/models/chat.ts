// ============================================
// Module 6: Iteration & Chat-Based Updates Types
// ============================================

export type IterationSessionStatus = "active" | "closed";
export type SuggestionStatus = "pending" | "approved" | "rejected" | "applied" | "partial" | "failed";
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

// ============================================
// Artifact Modification Engine (AME) Types
// ============================================

export type PlanStatus = "draft" | "confirmed" | "applying" | "applied" | "failed" | "rolled_back";
export type PlanActionStatus = "pending" | "applying" | "applied" | "failed" | "skipped";

export interface ModificationPlanAction {
    id: string;
    planId: string;
    module: SuggestionModule;
    targetId: string;
    actionType: SuggestionActionType;
    newContent?: string;
    status: PlanActionStatus;
    error?: string;
    rationale?: string;
    artifactVersionId?: string;
    createdAt: string;
}

export interface ModificationPlan {
    id: string;
    sessionId: string;
    userMessage: string;
    status: PlanStatus;
    summary: string | null;
    explanation: string;
    actions: ModificationPlanAction[];
    requiresConfirmation: boolean;
    createdAt: string;
}

export interface ModificationPlanResponse {
    plan: ModificationPlan;
}

export interface ModificationPlansListResponse {
    plans: ModificationPlan[];
    count: number;
}
