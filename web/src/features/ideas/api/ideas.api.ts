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

    // Create a new idea by uploading a document
    async uploadDocument(file: File): Promise<Idea> {
        const formData = new FormData();
        formData.append("file", file);
        const response = await apiClient.post<ApiResponse<IdeaResponse>>("/ideas/upload", formData);
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

    // Stream business description generation
    async streamBusinessDescription(id: string, onChunk: (data: any) => void): Promise<void> {
        const response = await apiClient.post<Response>(`/ideas/${id}/business-description/stream`, undefined, {}, true);
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
    async confirm(id: string, selections?: { selectedDocuments: string[]; selectedDiagrams: string[] }): Promise<Idea> {
        const response = await apiClient.post<ApiResponse<IdeaResponse>>(`/ideas/${id}/confirm`, selections);
        return response.data!.idea;
    },

    // Get discovery questionnaire
    async getQuestionnaire(id: string): Promise<any> {
        const response = await apiClient.get<ApiResponse<{ questionnaire: any }>>(`/ideas/${id}/questionnaire`);
        return response.data!.questionnaire;
    },

    // Submit discovery questionnaire responses
    async submitQuestionnaire(id: string, responses: any[]): Promise<any> {
        const response = await apiClient.post<ApiResponse<{ response: any }>>(`/ideas/${id}/questionnaire/submit`, { responses });
        return response.data!.response;
    },

    // Regenerate discovery questionnaire
    async regenerateQuestionnaire(id: string): Promise<any> {
        const response = await apiClient.post<ApiResponse<any>>(`/ideas/${id}/questionnaire/regenerate`);
        return response;
    },

    // Trigger research synthesis (fire-and-forget — server runs async)
    async startResearch(id: string): Promise<void> {
        await apiClient.post<ApiResponse<any>>(`/ideas/${id}/research`, undefined);
    },
};
