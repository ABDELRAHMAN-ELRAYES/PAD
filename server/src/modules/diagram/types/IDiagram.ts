// Diagram types for ideas
export type DiagramType = "ERD" | "SEQUENCE" | "SCHEMA" | "FLOWCHART" | "ARCHITECTURE";
export type DiagramStatus = "draft" | "published";

// Base diagram entity interface
export interface IDiagram {
    id: string;
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
    status: DiagramStatus;
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
}

// Input for updating a diagram
export interface IUpdateDiagramData {
    title?: string;
    mermaidCode?: string;
    status?: DiagramStatus;
    changelog?: string;
}

// Repository-specific data
export interface ICreateDiagramRepositoryData {
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
}

export interface IUpdateDiagramRepositoryData {
    title?: string;
    mermaidCode?: string;
    status?: DiagramStatus;
}

// Response types
export interface IDiagramResponse {
    id: string;
    ideaId: string;
    type: DiagramType;
    title: string;
    mermaidCode: string;
    status: DiagramStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IDiagramWithVersions extends IDiagram {
    versions: IDiagramVersion[];
}
