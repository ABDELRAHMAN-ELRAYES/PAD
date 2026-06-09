import { fetchWithAuth, streamRequest } from "@/api/client";
import {
    Diagram,
    DiagramWithVersions,
    DiagramVersion,
    UpdateDiagramInput,
    DiagramResponse,
    DiagramsListResponse,
    DiagramVersionsResponse,
} from "@/features/diagrams/types/models/diagrams";

// Diagram API functions
export const diagramApi = {
    // Generate diagrams for an idea (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/diagrams/generate/${ideaId}`, onChunk, {
            method: "POST",
        });
    },

    // Generate diagrams for an idea (Legacy/Sync)
    async generate(ideaId: string): Promise<Diagram[]> {
        const response = await fetchWithAuth<DiagramsListResponse>(`/diagrams/generate/${ideaId}`, {
            method: "POST",
        });
        return response.data!.diagrams;
    },

    // Get all diagrams for an idea
    async getByIdeaId(ideaId: string): Promise<Diagram[]> {
        const response = await fetchWithAuth<DiagramsListResponse>(`/diagrams/idea/${ideaId}`);
        return response.data!.diagrams;
    },

    // Get a single diagram
    async getById(id: string): Promise<Diagram> {
        const response = await fetchWithAuth<DiagramResponse>(`/diagrams/${id}`);
        return response.data!.diagram;
    },

    // Get diagram with versions
    async getWithVersions(id: string): Promise<DiagramWithVersions> {
        const response = await fetchWithAuth<{ diagram: DiagramWithVersions }>(`/diagrams/${id}/full`);
        return response.data!.diagram;
    },

    // Update a diagram
    async update(id: string, data: UpdateDiagramInput): Promise<Diagram> {
        const response = await fetchWithAuth<DiagramResponse>(`/diagrams/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.data!.diagram;
    },

    // Get version history
    async getVersions(id: string): Promise<DiagramVersion[]> {
        const response = await fetchWithAuth<DiagramVersionsResponse>(`/diagrams/${id}/versions`);
        return response.data!.versions;
    },

    // Regenerate a diagram
    async regenerate(id: string): Promise<Diagram> {
        const response = await fetchWithAuth<DiagramResponse>(`/diagrams/${id}/regenerate`, {
            method: "POST",
        });
        return response.data!.diagram;
    },
};
