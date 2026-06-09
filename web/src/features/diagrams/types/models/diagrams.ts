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
