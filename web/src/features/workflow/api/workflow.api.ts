import { fetchWithAuth, streamRequest } from "@/api/client";
import {
    Workflow,
    WorkflowResponse,
    WorkflowStep,
    UpdateWorkflowStepInput,
    WorkflowExportResponse,
} from "@/features/workflow/types/models/workflow";

// Workflow Generation & IDE Integration API (Module 5)
export const workflowApi = {
    // Generate an AI workflow from task breakdown (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/workflows/generate/${ideaId}`, onChunk, {
            method: "POST",
        });
    },

    // Generate an AI workflow from task breakdown (Legacy/Sync)
    async generate(ideaId: string): Promise<Workflow> {
        const response = await fetchWithAuth<WorkflowResponse>(
            `/workflows/generate/${ideaId}`,
            {
                method: "POST",
            }
        );
        return response.data!.workflow;
    },

    // Get workflow by Idea ID
    async getByIdeaId(ideaId: string): Promise<Workflow> {
        const response = await fetchWithAuth<WorkflowResponse>(
            `/workflows/idea/${ideaId}`
        );
        return response.data!.workflow;
    },

    // Update workflow step (status, instructions, etc)
    async updateStep(stepId: string, data: UpdateWorkflowStepInput): Promise<{ step: WorkflowStep }> {
        const response = await fetchWithAuth<{ step: WorkflowStep }>(
            `/workflows/steps/${stepId}`,
            {
                method: "PATCH",
                body: JSON.stringify(data),
            }
        );
        return response.data!;
    },

    // Export workflow for AI IDE
    async export(workflowId: string): Promise<string> {
        const response = await fetchWithAuth<WorkflowExportResponse>(
            `/workflows/${workflowId}/export`
        );
        return response.data!.export;
    },
};
