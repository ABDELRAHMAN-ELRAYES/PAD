import { apiClient, readNdJsonStream } from "@/api/client";
import {
    Idea,
    CreateIdeaInput,
    RefineIdeaInput,
    IdeaResponse,
    IdeasListResponse,
    ApiResponse,
} from "../types/models/idea";

// Idea API functions
export const ideaApi = {
    // Create a new idea
    async create(input: CreateIdeaInput): Promise<Idea> {
        const response = await apiClient.post<ApiResponse<IdeaResponse>>("/ideas", input);
        return response.data!.idea;
    },

    // Get a specific idea by ID
    async getById(id: string): Promise<Idea> {
        const response = await apiClient.get<ApiResponse<IdeaResponse>>(`/ideas/${id}`);
        return response.data!.idea;
    },

    // List all ideas for the current user
    async list(): Promise<Idea[]> {
        const response = await apiClient.get<ApiResponse<IdeasListResponse>>("/ideas");
        return response.data!.ideas;
    },

    // Analyze an idea with AI (Streaming)
    async analyzeStream(id: string, onChunk: (data: any) => void): Promise<void> {
        const response = await apiClient.post<Response>(`/ideas/${id}/analyze`, undefined, {}, true);
        await readNdJsonStream(response, onChunk);
    },

    // Analyze an idea with AI (Legacy/Sync)
    async analyze(id: string): Promise<Idea> {
        const response = await apiClient.post<ApiResponse<IdeaResponse>>(`/ideas/${id}/analyze`);
        return response.data!.idea;
    },

    // Refine an idea
    async refine(id: string, input: RefineIdeaInput): Promise<Idea> {
        const response = await apiClient.post<ApiResponse<IdeaResponse>>(`/ideas/${id}/refine`, input);
        return response.data!.idea;
    },

    // Confirm an idea
    async confirm(id: string): Promise<Idea> {
        const response = await apiClient.post<ApiResponse<IdeaResponse>>(`/ideas/${id}/confirm`);
        return response.data!.idea;
    },
};
