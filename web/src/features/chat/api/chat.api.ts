import { apiClient } from "@/api/client";
import {
    IterationSession,
    IterationSessionResponse,
    IterationMessage,
    IterationMessageResponse,
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
};
