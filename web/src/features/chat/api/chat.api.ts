import { apiClient } from "@/api/client";
import {
    IterationSession,
    IterationSessionResponse,
    IterationMessage,
    IterationMessageResponse,
    IterationSuggestion,
    IterationSuggestionResponse,
    ModificationPlan,
    ModificationPlanResponse,
    ModificationPlansListResponse,
} from "../types/models/chat";
import { ApiResponse } from "@/features/ideas/types/models/idea";

// Iterative Feedback & Chat-Based Updates API (Module 6)
export const iterationApi = {
    // Get (or auto-create) an iteration session for an idea
    async getSession(ideaId: string): Promise<IterationSession> {
        const response = await apiClient.get<ApiResponse<IterationSessionResponse>>(
            `/iterations/idea/${ideaId}`
        );
        return response.data!.session;
    },

    // Send a user message to the iteration session
    async sendMessage(ideaId: string, content: string): Promise<IterationMessage> {
        const response = await apiClient.post<ApiResponse<IterationMessageResponse>>(
            `/iterations/idea/${ideaId}/message`,
            { content }
        );
        return response.data!.message;
    },

    // Approve a pending suggestion
    async approveSuggestion(suggestionId: string): Promise<IterationSuggestion> {
        const response = await apiClient.post<ApiResponse<IterationSuggestionResponse>>(
            `/iterations/suggestion/${suggestionId}/approve`
        );
        return response.data!.suggestion;
    },

    // Reject a pending suggestion
    async rejectSuggestion(suggestionId: string): Promise<IterationSuggestion> {
        const response = await apiClient.post<ApiResponse<IterationSuggestionResponse>>(
            `/iterations/suggestion/${suggestionId}/reject`
        );
        return response.data!.suggestion;
    },
};

// Plan API (Artifact Modification Engine)
export const planApi = {
    // Generate modification plan preview
    async generate(ideaId: string, content: string): Promise<ModificationPlan> {
        const response = await apiClient.post<ApiResponse<ModificationPlanResponse>>(
            `/iterations/idea/${ideaId}/plan`,
            { content }
        );
        return response.data!.plan;
    },

    // Get plan by ID
    async getById(planId: string): Promise<ModificationPlan> {
        const response = await apiClient.get<ApiResponse<ModificationPlanResponse>>(
            `/iterations/plan/${planId}`
        );
        return response.data!.plan;
    },

    // Confirm and execute plan
    async confirm(ideaId: string, planId: string): Promise<ModificationPlan> {
        const response = await apiClient.post<ApiResponse<ModificationPlanResponse>>(
            `/iterations/idea/${ideaId}/plan/${planId}/confirm`
        );
        return response.data!.plan;
    },

    // Get change history for idea
    async getHistory(ideaId: string): Promise<ModificationPlan[]> {
        const response = await apiClient.get<ApiResponse<ModificationPlansListResponse>>(
            `/iterations/idea/${ideaId}/history`
        );
        return response.data!.plans;
    },

    // Rollback a plan
    async rollback(ideaId: string, planId: string): Promise<ModificationPlan> {
        const response = await apiClient.post<ApiResponse<ModificationPlanResponse>>(
            `/iterations/idea/${ideaId}/plan/${planId}/rollback`
        );
        return response.data!.plan;
    },
};
