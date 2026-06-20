// Feature status and priority types
export type FeatureSource = "auto" | "manual" | "ai_suggested";
export type FeatureStatus = "active" | "archived";
export type Priority = "low" | "medium" | "high" | "critical";

// Base feature entity interface
export interface IFeature {
    id: string;
    ideaId: string;
    title: string;
    description: string;
    businessValue: string | null;
    userValue: string | null;
    acceptanceCriteria: string[] | any;
    source: FeatureSource;
    status: FeatureStatus;
    priority: Priority;
    complexity: string;
    dependencies: string[] | any;
    technicalScope: string | null;
    suggestedTaskCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// Feature version interface
export interface IFeatureVersion {
    id: string;
    featureId: string;
    version: number;
    title: string;
    description: string;
    businessValue: string | null;
    userValue: string | null;
    acceptanceCriteria: string[] | any;
    priority: Priority;
    complexity: string;
    dependencies: string[] | any;
    technicalScope: string | null;
    suggestedTaskCount: number;
    changelog: string | null;
    createdAt: Date;
}

// Input for creating a new feature
export interface ICreateFeatureData {
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

// Input for updating a feature
export interface IUpdateFeatureData {
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

// Repository-specific data
export interface ICreateFeatureRepositoryData {
    ideaId: string;
    title: string;
    description: string;
    businessValue?: string | null;
    userValue?: string | null;
    acceptanceCriteria?: string[] | any;
    source: FeatureSource;
    priority: Priority;
    complexity?: string;
    dependencies?: string[] | any;
    technicalScope?: string | null;
    suggestedTaskCount?: number;
}

export interface IUpdateFeatureRepositoryData {
    title?: string;
    description?: string;
    businessValue?: string | null;
    userValue?: string | null;
    acceptanceCriteria?: string[] | any;
    priority?: Priority;
    complexity?: string;
    dependencies?: string[] | any;
    technicalScope?: string | null;
    suggestedTaskCount?: number;
    status?: FeatureStatus;
}

// Feature with related data
export interface IFeatureWithTasks {
    id: string;
    ideaId: string;
    title: string;
    description: string;
    source: FeatureSource;
    status: FeatureStatus;
    priority: Priority;
    createdAt: Date;
    updatedAt: Date;
    tasks: any[]; // Will be populated with tasks
    diagramLinks?: any[]; // Will be populated with diagram links
}

// API response types
export interface IFeatureResponse {
    feature: IFeature;
}

export interface IFeaturesListResponse {
    features: IFeature[];
    count: number;
}
