import { fetchWithAuth } from "@/api/client";
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

// Iterative Feedback & Chat-Based Updates API (Module 6)
export const iterationApi = {
    // Get (or auto-create) an iteration session for an idea
    async getSession(ideaId: string): Promise<IterationSession> {
        const response = await fetchWithAuth<IterationSessionResponse>(
            `/iterations/idea/${ideaId}`
        );
        return response.data!.session;
    },

    // Send a user message to the iteration session
    async sendMessage(ideaId: string, content: string): Promise<IterationMessage> {
        const response = await fetchWithAuth<IterationMessageResponse>(
            `/iterations/idea/${ideaId}/message`,
            {
                method: "POST",
                body: JSON.stringify({ content }),
            }
        );
        return response.data!.message;
    },

    // Approve a pending suggestion
    async approveSuggestion(suggestionId: string): Promise<IterationSuggestion> {
        const response = await fetchWithAuth<IterationSuggestionResponse>(
            `/iterations/suggestion/${suggestionId}/approve`,
            {
                method: "POST",
            }
        );
        return response.data!.suggestion;
    },

    // Reject a pending suggestion
    async rejectSuggestion(suggestionId: string): Promise<IterationSuggestion> {
        const response = await fetchWithAuth<IterationSuggestionResponse>(
            `/iterations/suggestion/${suggestionId}/reject`,
            {
                method: "POST",
            }
        );
        return response.data!.suggestion;
    },
};

// Plan API (Artifact Modification Engine)
export const planApi = {
    // Generate modification plan preview
    async generate(ideaId: string, content: string): Promise<ModificationPlan> {
        const response = await fetchWithAuth<ModificationPlanResponse>(
            `/iterations/idea/${ideaId}/plan`,
            {
                method: "POST",
                body: JSON.stringify({ content }),
            }
        );
        return response.data!.plan;
    },

    // Get plan by ID
    async getById(planId: string): Promise<ModificationPlan> {
        const response = await fetchWithAuth<ModificationPlanResponse>(
            `/iterations/plan/${planId}`
        );
        return response.data!.plan;
    },

    // Confirm and execute plan
    async confirm(ideaId: string, planId: string): Promise<ModificationPlan> {
        const response = await fetchWithAuth<ModificationPlanResponse>(
            `/iterations/idea/${ideaId}/plan/${planId}/confirm`,
            {
                method: "POST",
            }
        );
        return response.data!.plan;
    },

    // Get change history for idea
    async getHistory(ideaId: string): Promise<ModificationPlan[]> {
        const response = await fetchWithAuth<ModificationPlansListResponse>(
            `/iterations/idea/${ideaId}/history`
        );
        return response.data!.plans;
    },

    // Rollback a plan
    async rollback(ideaId: string, planId: string): Promise<ModificationPlan> {
        const response = await fetchWithAuth<ModificationPlanResponse>(
            `/iterations/idea/${ideaId}/plan/${planId}/rollback`,
            {
                method: "POST",
            }
        );
        return response.data!.plan;
    },
};
