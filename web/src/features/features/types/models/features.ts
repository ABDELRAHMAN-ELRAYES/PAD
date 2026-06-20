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
    businessValue?: string | null;
    userValue?: string | null;
    acceptanceCriteria?: string[];
    source: FeatureSource;
    status: FeatureStatus;
    priority: Priority;
    complexity?: string;
    dependencies?: string[];
    technicalScope?: string | null;
    suggestedTaskCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface FeatureVersion {
    id: string;
    featureId: string;
    version: number;
    title: string;
    description: string;
    businessValue?: string | null;
    userValue?: string | null;
    acceptanceCriteria?: string[];
    priority: Priority;
    complexity?: string;
    dependencies?: string[];
    technicalScope?: string | null;
    suggestedTaskCount?: number;
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
    businessValue?: string;
    userValue?: string;
    acceptanceCriteria?: string[];
    source?: FeatureSource;
    priority?: Priority;
    complexity?: string;
    dependencies?: string[];
    technicalScope?: string;
    suggestedTaskCount?: number;
}

export interface UpdateFeatureInput {
    title?: string;
    description?: string;
    businessValue?: string;
    userValue?: string;
    acceptanceCriteria?: string[];
    priority?: Priority;
    complexity?: string;
    dependencies?: string[];
    technicalScope?: string;
    suggestedTaskCount?: number;
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
