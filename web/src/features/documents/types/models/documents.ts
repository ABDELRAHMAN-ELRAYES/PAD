export type DocumentType =
    | "BRD"
    | "PRD"
    | "SRS"
    | "FRS"
    | "SYSTEM_ARCH"
    | "API_SPEC"
    | "TEST_PLAN"
    | "USER_MANUAL"
    | "SECURITY_PLAN";
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
