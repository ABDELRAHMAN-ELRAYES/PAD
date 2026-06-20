import { apiClient, readNdJsonStream } from "@/api/client";
import {
    Workflow,
    WorkflowResponse,
    WorkflowStep,
    UpdateWorkflowStepInput,
    WorkflowExportResponse,
    HandoffPackage,
    HandoffPackageResponse,
    HandoffArtifactResponse,
    UpdateArtifactInput,
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

// ============================================================
// Handoff Package API (Module 5 Redesign)
// ============================================================
export const handoffApi = {
    // SSE compile stream — returns an EventSource
    openCompileStream(ideaId: string): EventSource {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
        return new EventSource(`${baseUrl}/workflows/handoff/generate/${ideaId}`);
    },

    // Get latest package by idea ID (artifact tree, no content)
    async getByIdea(ideaId: string): Promise<HandoffPackage | null> {
        const response = await apiClient.get<ApiResponse<HandoffPackageResponse>>(
            `/workflows/handoff/idea/${ideaId}`
        );
        return response.data!.package;
    },

    // Get single artifact with full content
    async getArtifact(artifactId: string): Promise<HandoffArtifactResponse["artifact"]> {
        const response = await apiClient.get<ApiResponse<HandoffArtifactResponse>>(
            `/workflows/handoff/artifacts/${artifactId}`
        );
        return response.data!.artifact;
    },

    // Update artifact content (manual edit)
    async updateArtifact(artifactId: string, data: UpdateArtifactInput): Promise<void> {
        await apiClient.put<ApiResponse<any>>(
            `/workflows/handoff/artifacts/${artifactId}`,
            data
        );
    },

    // Get compiled master prompt string for clipboard
    async getMasterPrompt(packageId: string): Promise<string> {
        const response = await apiClient.get<ApiResponse<{ prompt: string }>>(
            `/workflows/handoff/prompt/${packageId}`
        );
        return response.data!.prompt;
    },

    // Download ZIP — triggers browser file download
    downloadZip(packageId: string): void {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
        const link = document.createElement("a");
        link.href = `${baseUrl}/workflows/handoff/download/${packageId}`;
        link.download = `handoff-package-v1.zip`;
        link.click();
    },
};
