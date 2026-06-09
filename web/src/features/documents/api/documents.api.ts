import { fetchWithAuth, streamRequest } from "@/api/client";
import {
    Document,
    DocumentWithVersions,
    DocumentVersion,
    UpdateDocumentInput,
    DocumentResponse,
    DocumentsListResponse,
    DocumentVersionsResponse,
    ExportFormat,
} from "@/features/documents/types/models/documents";

// Document API functions
export const documentApi = {
    // Generate PRD & BRD for an idea (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/documents/generate/${ideaId}`, onChunk, {
            method: "POST",
        });
    },

    // Generate PRD & BRD for an idea (Legacy/Sync)
    async generate(ideaId: string): Promise<Document[]> {
        const response = await fetchWithAuth<DocumentsListResponse>(`/documents/generate/${ideaId}`, {
            method: "POST",
        });
        return response.data!.documents;
    },

    // Get a document by ID
    async getById(id: string): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}`);
        return response.data!.document;
    },

    // Get document with versions
    async getWithVersions(id: string): Promise<DocumentWithVersions> {
        const response = await fetchWithAuth<{ document: DocumentWithVersions }>(`/documents/${id}/full`);
        return response.data!.document;
    },

    // Get all documents for an idea
    async getByIdeaId(ideaId: string): Promise<Document[]> {
        const response = await fetchWithAuth<DocumentsListResponse>(`/documents/idea/${ideaId}`);
        return response.data!.documents;
    },

    // Update a document
    async update(id: string, data: UpdateDocumentInput): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.data!.document;
    },

    // Get version history
    async getVersions(id: string): Promise<DocumentVersion[]> {
        const response = await fetchWithAuth<DocumentVersionsResponse>(`/documents/${id}/versions`);
        return response.data!.versions;
    },

    // Revert to a specific version
    async revertToVersion(id: string, version: number): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}/revert/${version}`, {
            method: "POST",
        });
        return response.data!.document;
    },

    // Regenerate a document (Streaming)
    async regenerateStream(id: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/documents/${id}/regenerate`, onChunk, {
            method: "POST",
        });
    },

    // Regenerate a document
    async regenerate(id: string): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}/regenerate`, {
            method: "POST",
        });
        return response.data!.document;
    },

    // Export document
    async export(id: string, format: ExportFormat): Promise<Blob> {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/documents/${id}/export/${format}`, {
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Export failed");
        }
        return response.blob();
    },
};
