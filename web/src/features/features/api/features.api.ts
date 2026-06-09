import { apiClient, readNdJsonStream } from "@/api/client";
import {
    Feature,
    FeatureVersion,
    CreateFeatureInput,
    UpdateFeatureInput,
    FeatureResponse,
    FeaturesListResponse,
    Task,
    TaskVersion,
    CreateTaskInput,
    UpdateTaskInput,
    TaskResponse,
    TasksListResponse,
} from "@/features/features/types/models/features";
import { ApiResponse } from "@/features/ideas/types/models/idea";

// Feature API functions
export const featureApi = {
    // Extract features from PRD/BRD using AI (Streaming)
    async extractStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        const response = await apiClient.post<Response>(`/features/extract/${ideaId}`, undefined, {}, true);
        await readNdJsonStream(response, onChunk);
    },

    // Extract features from PRD/BRD using AI (Legacy/Sync)
    async extractFromDocuments(ideaId: string): Promise<Feature[]> {
        const response = await apiClient.post<ApiResponse<FeaturesListResponse>>(`/features/extract/${ideaId}`);
        return response.data!.features;
    },

    // Create a new feature
    async create(data: CreateFeatureInput): Promise<Feature> {
        const response = await apiClient.post<ApiResponse<FeatureResponse>>(`/features`, data);
        return response.data!.feature;
    },

    // Get a single feature
    async get(id: string): Promise<Feature> {
        const response = await apiClient.get<ApiResponse<FeatureResponse>>(`/features/${id}`);
        return response.data!.feature;
    },

    // Get all features for an idea
    async getByIdea(ideaId: string): Promise<Feature[]> {
        const response = await apiClient.get<ApiResponse<FeaturesListResponse>>(`/features/idea/${ideaId}`);
        return response.data!.features;
    },

    // Update a feature
    async update(id: string, data: UpdateFeatureInput): Promise<Feature> {
        const response = await apiClient.put<ApiResponse<FeatureResponse>>(`/features/${id}`, data);
        return response.data!.feature;
    },

    // Delete a feature
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/features/${id}`);
    },

    // Get version history
    async getVersions(id: string): Promise<FeatureVersion[]> {
        const response = await apiClient.get<ApiResponse<any>>(`/features/${id}/versions`);
        return response.data?.versions || (response.data as any) || [];
    },

    // Link feature to diagram
    async linkDiagram(featureId: string, diagramId: string): Promise<void> {
        await apiClient.post(`/features/${featureId}/diagrams/${diagramId}`);
    },

    // Unlink feature from diagram
    async unlinkDiagram(featureId: string, diagramId: string): Promise<void> {
        await apiClient.delete(`/features/${featureId}/diagrams/${diagramId}`);
    },
};

// Task API functions
export const taskApi = {
    // Suggest tasks for a feature using AI
    async suggestForFeature(featureId: string): Promise<Task[]> {
        const response = await apiClient.post<ApiResponse<TasksListResponse>>(`/tasks/suggest/${featureId}`);
        return response.data!.tasks;
    },

    // Create a new task
    async create(data: CreateTaskInput): Promise<Task> {
        const response = await apiClient.post<ApiResponse<TaskResponse>>(`/tasks`, data);
        return response.data!.task;
    },

    // Get a single task
    async get(id: string): Promise<Task> {
        const response = await apiClient.get<ApiResponse<TaskResponse>>(`/tasks/${id}`);
        return response.data!.task;
    },

    // Get all tasks for a feature
    async getByFeature(featureId: string): Promise<Task[]> {
        const response = await apiClient.get<ApiResponse<TasksListResponse>>(`/tasks/feature/${featureId}`);
        return response.data!.tasks;
    },

    // Update a task
    async update(id: string, data: UpdateTaskInput): Promise<Task> {
        const response = await apiClient.put<ApiResponse<TaskResponse>>(`/tasks/${id}`, data);
        return response.data!.task;
    },

    // Update task status
    async updateStatus(id: string, status: string): Promise<Task> {
        const response = await apiClient.patch<ApiResponse<TaskResponse>>(`/tasks/${id}/status`, { status });
        return response.data!.task;
    },

    // Delete a task
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/tasks/${id}`);
    },

    // Get version history
    async getVersions(id: string): Promise<TaskVersion[]> {
        const response = await apiClient.get<ApiResponse<any>>(`/tasks/${id}/versions`);
        return response.data?.versions || (response.data as any) || [];
    },

    // Add dependency
    async addDependency(taskId: string, dependsOnId: string): Promise<void> {
        await apiClient.post(`/tasks/${taskId}/dependencies/${dependsOnId}`);
    },

    // Remove dependency
    async removeDependency(taskId: string, dependsOnId: string): Promise<void> {
        await apiClient.delete(`/tasks/${taskId}/dependencies/${dependsOnId}`);
    },
};
