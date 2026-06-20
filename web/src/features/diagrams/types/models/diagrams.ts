// ============================================
// Diagram Types (Module 3)
// ============================================

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

export interface Diagram {
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
    tier1Code?: string | null;
    tier2Code?: string | null;
    tier3Code?: string | null;
    activeTier?: number | null;
    validationError?: string | null;
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
