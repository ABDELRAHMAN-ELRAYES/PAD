import { fetchWithAuth, streamRequest } from "@/api/client";
import {
    Idea,
    CreateIdeaInput,
    RefineIdeaInput,
    IdeaResponse,
    IdeasListResponse,
} from "../types/models/idea";

// Idea API functions
export const ideaApi = {
    // Create a new idea
    async create(input: CreateIdeaInput): Promise<Idea> {
        const response = await fetchWithAuth<IdeaResponse>("/ideas", {
            method: "POST",
            body: JSON.stringify(input),
        });
        return response.data!.idea;
    },

    // Get a specific idea by ID
    async getById(id: string): Promise<Idea> {
        const response = await fetchWithAuth<IdeaResponse>(`/ideas/${id}`);
        return response.data!.idea;
    },

    // List all ideas for the current user
    async list(): Promise<Idea[]> {
        const response = await fetchWithAuth<IdeasListResponse>("/ideas");
        return response.data!.ideas;
    },

    // Analyze an idea with AI (Streaming)
    async analyzeStream(id: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/ideas/${id}/analyze`, onChunk, {
            method: "POST",
        });
    },

    // Analyze an idea with AI (Legacy/Sync)
    async analyze(id: string): Promise<Idea> {
        const response = await fetchWithAuth<IdeaResponse>(`/ideas/${id}/analyze`, {
            method: "POST",
        });
        return response.data!.idea;
    },

    // Refine an idea
    async refine(id: string, input: RefineIdeaInput): Promise<Idea> {
        const response = await fetchWithAuth<IdeaResponse>(`/ideas/${id}/refine`, {
            method: "POST",
            body: JSON.stringify(input),
        });
        return response.data!.idea;
    },

    // Confirm an idea
    async confirm(id: string): Promise<Idea> {
        const response = await fetchWithAuth<IdeaResponse>(`/ideas/${id}/confirm`, {
            method: "POST",
        });
        return response.data!.idea;
    },
};
