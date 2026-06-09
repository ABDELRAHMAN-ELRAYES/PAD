import { apiClient, readNdJsonStream } from "@/api/client";
import {
    Diagram,
    DiagramWithVersions,
    DiagramVersion,
    UpdateDiagramInput,
    DiagramResponse,
    DiagramsListResponse,
    DiagramVersionsResponse,
} from "@/features/diagrams/types/models/diagrams";
import { ApiResponse } from "@/features/ideas/types/models/idea";

// Diagram API functions
export const diagramApi = {
    // Generate diagrams for an idea (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        const response = await apiClient.post<Response>(`/diagrams/generate/${ideaId}`, undefined, {}, true);
        await readNdJsonStream(response, onChunk);
    },

    // Generate diagrams for an idea (Legacy/Sync)
    async generate(ideaId: string): Promise<Diagram[]> {
        const response = await apiClient.post<ApiResponse<DiagramsListResponse>>(`/diagrams/generate/${ideaId}`);
        return response.data!.diagrams;
    },

    // Get all diagrams for an idea
    async getByIdeaId(ideaId: string): Promise<Diagram[]> {
        const response = await apiClient.get<ApiResponse<DiagramsListResponse>>(`/diagrams/idea/${ideaId}`);
        return response.data!.diagrams;
    },

    // Get a single diagram
    async getById(id: string): Promise<Diagram> {
        const response = await apiClient.get<ApiResponse<DiagramResponse>>(`/diagrams/${id}`);
        return response.data!.diagram;
    },

    // Get diagram with versions
    async getWithVersions(id: string): Promise<DiagramWithVersions> {
        const response = await apiClient.get<ApiResponse<{ diagram: DiagramWithVersions }>>(`/diagrams/${id}/full`);
        return response.data!.diagram;
    },

    // Update a diagram
    async update(id: string, data: UpdateDiagramInput): Promise<Diagram> {
        const response = await apiClient.put<ApiResponse<DiagramResponse>>(`/diagrams/${id}`, data);
        return response.data!.diagram;
    },

    // Get version history
    async getVersions(id: string): Promise<DiagramVersion[]> {
        const response = await apiClient.get<ApiResponse<DiagramVersionsResponse>>(`/diagrams/${id}/versions`);
        return response.data!.versions;
    },

    // Regenerate a diagram
    async regenerate(id: string): Promise<Diagram> {
        const response = await apiClient.post<ApiResponse<DiagramResponse>>(`/diagrams/${id}/regenerate`);
        return response.data!.diagram;
    },
};
