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

// Base document entity
export interface IDocument {
    id: string;
    ideaId: string;
    type: DocumentType;
    title: string;
    content: string;
    status: DocumentStatus;
    createdAt: Date;
    updatedAt: Date;
}

// Document version entity
export interface IDocumentVersion {
    id: string;
    documentId: string;
    version: number;
    content: string;
    changelog: string | null;
    createdAt: Date;
}

// Create document input (for repository)
export interface ICreateDocumentData {
    ideaId: string;
    type: DocumentType;
    title: string;
    content: string;
}

// Update document input
export interface IUpdateDocumentData {
    title?: string;
    content?: string;
    status?: DocumentStatus;
}

// Update with changelog for versioning
export interface IUpdateDocumentWithChangelogData extends IUpdateDocumentData {
    changelog?: string;
}

// Response types
export interface IDocumentResponse extends IDocument {
    versions?: IDocumentVersion[];
}

export interface IDocumentWithVersions extends IDocument {
    versions: IDocumentVersion[];
}

// Generated document content from AI
export interface IGeneratedDocumentContent {
    title: string;
    content: string;
}
