import { apiClient, readNdJsonStream } from "@/api/client";
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
import { ApiResponse } from "@/features/ideas/types/models/idea";

// Document API functions
export const documentApi = {
    // Generate PRD & BRD for an idea (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        const response = await apiClient.post<Response>(`/documents/generate/${ideaId}`, undefined, {}, true);
        await readNdJsonStream(response, onChunk);
    },

    // Generate PRD & BRD for an idea (Legacy/Sync)
    async generate(ideaId: string): Promise<Document[]> {
        const response = await apiClient.post<ApiResponse<DocumentsListResponse>>(`/documents/generate/${ideaId}`);
        return response.data!.documents;
    },

    // Get a document by ID
    async getById(id: string): Promise<Document> {
        const response = await apiClient.get<ApiResponse<DocumentResponse>>(`/documents/${id}`);
        return response.data!.document;
    },

    // Get document with versions
    async getWithVersions(id: string): Promise<DocumentWithVersions> {
        const response = await apiClient.get<ApiResponse<{ document: DocumentWithVersions }>>(`/documents/${id}/full`);
        return response.data!.document;
    },

    // Get all documents for an idea
    async getByIdeaId(ideaId: string): Promise<Document[]> {
        const response = await apiClient.get<ApiResponse<DocumentsListResponse>>(`/documents/idea/${ideaId}`);
        return response.data!.documents;
    },

    // Update a document
    async update(id: string, data: UpdateDocumentInput): Promise<Document> {
        const response = await apiClient.put<ApiResponse<DocumentResponse>>(`/documents/${id}`, data);
        return response.data!.document;
    },

    // Get version history
    async getVersions(id: string): Promise<DocumentVersion[]> {
        const response = await apiClient.get<ApiResponse<DocumentVersionsResponse>>(`/documents/${id}/versions`);
        return response.data!.versions;
    },

    // Revert to a specific version
    async revertToVersion(id: string, version: number): Promise<Document> {
        const response = await apiClient.post<ApiResponse<DocumentResponse>>(`/documents/${id}/revert/${version}`);
        return response.data!.document;
    },

    // Regenerate a document (Streaming)
    async regenerateStream(id: string, onChunk: (data: any) => void): Promise<void> {
        const response = await apiClient.post<Response>(`/documents/${id}/regenerate`, undefined, {}, true);
        await readNdJsonStream(response, onChunk);
    },

    // Regenerate a document
    async regenerate(id: string): Promise<Document> {
        const response = await apiClient.post<ApiResponse<DocumentResponse>>(`/documents/${id}/regenerate`);
        return response.data!.document;
    },

    // Export document
    async export(id: string, format: ExportFormat): Promise<Blob> {
        const response = await apiClient.get<Response>(`/documents/${id}/export/${format}`, {}, true);
        return response.blob();
    },
};
