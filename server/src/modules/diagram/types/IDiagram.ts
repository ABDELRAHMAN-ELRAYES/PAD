// Diagram types for ideas
export type DiagramType =
    | "SYSTEM_ARCHITECTURE"
    | "DATABASE_ERD"
    | "SEQUENCE"
    | "COMPONENT"
    | "DEPLOYMENT"
    | "USER_FLOW"
    | "CLASS"
    | "STATE"
    | "USE_CASE"
    | "ACTIVITY";

export type DiagramStatus = "draft" | "published" | "repair_failed";

// Base diagram entity interface
export interface IDiagram {
    id: string;
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
    status: DiagramStatus;
    tier1Code: string | null;
    tier2Code: string | null;
    tier3Code: string | null;
    activeTier: number | null;
    validationError: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Diagram version entity interface
export interface IDiagramVersion {
    id: string;
    diagramId: string;
    version: number;
    mermaidCode: string;
    changelog: string | null;
    createdAt: Date;
}

// Input for creating a new diagram
export interface ICreateDiagramData {
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
    tier1Code?: string | null;
    tier2Code?: string | null;
    tier3Code?: string | null;
    activeTier?: number | null;
    validationError?: string | null;
}

// Input for updating a diagram
export interface IUpdateDiagramData {
    title?: string;
    mermaidCode?: string;
    status?: DiagramStatus;
    changelog?: string;
    tier1Code?: string | null;
    tier2Code?: string | null;
    tier3Code?: string | null;
    activeTier?: number | null;
    validationError?: string | null;
}

// Repository-specific data
export interface ICreateDiagramRepositoryData {
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
    tier1Code?: string | null;
    tier2Code?: string | null;
    tier3Code?: string | null;
    activeTier?: number | null;
    validationError?: string | null;
}

export interface IUpdateDiagramRepositoryData {
    title?: string;
    mermaidCode?: string;
    status?: DiagramStatus;
    tier1Code?: string | null;
    tier2Code?: string | null;
    tier3Code?: string | null;
    activeTier?: number | null;
    validationError?: string | null;
}

// Response types
export interface IDiagramResponse {
    id: string;
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
    status: DiagramStatus;
    tier1Code: string | null;
    tier2Code: string | null;
    tier3Code: string | null;
    activeTier: number | null;
    validationError: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface IDiagramWithVersions extends IDiagram {
    versions: IDiagramVersion[];
}
