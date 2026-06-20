import { apiClient } from "@/api/client";
import {
    Diagram,
    DiagramType,
    DiagramWithVersions,
    DiagramVersion,
    UpdateDiagramInput,
    DiagramResponse,
    DiagramsListResponse,
    DiagramVersionsResponse,
} from "@/features/diagrams/types/models/diagrams";
import { ApiResponse } from "@/features/ideas/types/models/idea";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export const diagramApi = {
    // Generate diagrams for an idea (initialize placeholders)
    async generate(ideaId: string, type?: DiagramType): Promise<Diagram[]> {
        const response = await apiClient.post<ApiResponse<DiagramsListResponse>>(`/diagrams/generate/${ideaId}`, undefined, {
            params: type ? { type } : undefined
        });
        return response.data!.diagrams;
    },

    // Stream generation (SSE)
    generateStream(
        id: string,
        onChunk: (chunk: string) => void,
        onComplete: (data: { title: string; code: string; status: string; validationError: string | null }) => void,
        onError: (err: any) => void,
        onStatus?: (status: string) => void
    ): () => void {
        const url = `${BASE_URL}/diagrams/${id}/generate-stream`;
        const eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.chunk) {
                    onChunk(data.chunk);
                }
            } catch (err) {
                console.error("SSE parse error", err);
            }
        };

        eventSource.addEventListener("status", (event: any) => {
            try {
                const data = JSON.parse(event.data);
                if (data.status && onStatus) {
                    onStatus(data.status);
                }
            } catch (err) {
                console.error("SSE parse status error", err);
            }
        });

        eventSource.addEventListener("complete", (event: any) => {
            try {
                const data = JSON.parse(event.data);
                onComplete(data);
                eventSource.close();
            } catch (err) {
                onError(err);
                eventSource.close();
            }
        });

        eventSource.addEventListener("error", (event: any) => {
            let message = "Streaming failed";
            if (event.data) {
                try {
                    const parsed = JSON.parse(event.data);
                    message = parsed.message || message;
                } catch (e) {}
            }
            onError(new Error(message));
            eventSource.close();
        });

        return () => {
            eventSource.close();
        };
    },

    // Stream regeneration (SSE)
    regenerateStream(
        id: string,
        onChunk: (chunk: string) => void,
        onComplete: (data: { title: string; code: string; status: string; validationError: string | null }) => void,
        onError: (err: any) => void,
        onStatus?: (status: string) => void
    ): () => void {
        const url = `${BASE_URL}/diagrams/${id}/regenerate-stream`;
        const eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.chunk) {
                    onChunk(data.chunk);
                }
            } catch (err) {
                console.error("SSE parse error", err);
            }
        };

        eventSource.addEventListener("status", (event: any) => {
            try {
                const data = JSON.parse(event.data);
                if (data.status && onStatus) {
                    onStatus(data.status);
                }
            } catch (err) {
                console.error("SSE parse status error", err);
            }
        });

        eventSource.addEventListener("complete", (event: any) => {
            try {
                const data = JSON.parse(event.data);
                onComplete(data);
                eventSource.close();
            } catch (err) {
                onError(err);
                eventSource.close();
            }
        });

        eventSource.addEventListener("error", (event: any) => {
            let message = "Regeneration streaming failed";
            if (event.data) {
                try {
                    const parsed = JSON.parse(event.data);
                    message = parsed.message || message;
                } catch (e) {}
            }
            onError(new Error(message));
            eventSource.close();
        });

        return () => {
            eventSource.close();
        };
    },

    // Repair invalid Mermaid code
    async repair(id: string, code: string, errorMessage: string): Promise<Diagram> {
        const response = await apiClient.post<ApiResponse<DiagramResponse>>(`/diagrams/${id}/repair`, {
            code,
            errorMessage,
        });
        return response.data!.diagram;
    },

    // Import a diagram
    async import(id: string, code: string, title?: string): Promise<Diagram> {
        const response = await apiClient.post<ApiResponse<DiagramResponse>>(`/diagrams/${id}/import`, {
            code,
            title,
        });
        return response.data!.diagram;
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
};
