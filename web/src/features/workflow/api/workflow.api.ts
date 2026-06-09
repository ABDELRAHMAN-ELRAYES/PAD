import { apiClient, readNdJsonStream } from "@/api/client";
import {
    Workflow,
    WorkflowResponse,
    WorkflowStep,
    UpdateWorkflowStepInput,
    WorkflowExportResponse,
} from "@/features/workflow/types/models/workflow";
import { ApiResponse } from "@/features/ideas/types/models/idea";

// Workflow Generation & IDE Integration API (Module 5)
export const workflowApi = {
    // Generate an AI workflow from task breakdown (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        const response = await apiClient.post<Response>(`/workflows/generate/${ideaId}`, undefined, {}, true);
        await readNdJsonStream(response, onChunk);
    },

    // Generate an AI workflow from task breakdown (Legacy/Sync)
    async generate(ideaId: string): Promise<Workflow> {
        const response = await apiClient.post<ApiResponse<WorkflowResponse>>(
            `/workflows/generate/${ideaId}`
        );
        return response.data!.workflow;
    },

    // Get workflow by Idea ID
    async getByIdeaId(ideaId: string): Promise<Workflow> {
        const response = await apiClient.get<ApiResponse<WorkflowResponse>>(
            `/workflows/idea/${ideaId}`
        );
        return response.data!.workflow;
    },

    // Update workflow step (status, instructions, etc)
    async updateStep(stepId: string, data: UpdateWorkflowStepInput): Promise<{ step: WorkflowStep }> {
        const response = await apiClient.patch<ApiResponse<{ step: WorkflowStep }>>(
            `/workflows/steps/${stepId}`,
            data
        );
        return response.data!;
    },

    // Export workflow for AI IDE
    async export(workflowId: string): Promise<string> {
        const response = await apiClient.get<ApiResponse<WorkflowExportResponse>>(
            `/workflows/${workflowId}/export`
        );
        return response.data!.export;
    },
};
