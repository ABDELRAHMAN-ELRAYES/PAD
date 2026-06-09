import { fetchWithAuth, streamRequest } from "@/api/client";
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

// Feature API functions
export const featureApi = {
    // Extract features from PRD/BRD using AI (Streaming)
    async extractStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/features/extract/${ideaId}`, onChunk, {
            method: "POST",
        });
    },

    // Extract features from PRD/BRD using AI (Legacy/Sync)
    async extractFromDocuments(ideaId: string): Promise<Feature[]> {
        const response = await fetchWithAuth<FeaturesListResponse>(`/features/extract/${ideaId}`, {
            method: "POST",
        });
        return response.data!.features;
    },

    // Create a new feature
    async create(data: CreateFeatureInput): Promise<Feature> {
        const response = await fetchWithAuth<FeatureResponse>(`/features`, {
            method: "POST",
            body: JSON.stringify(data),
        });
        return response.data!.feature;
    },

    // Get a single feature
    async get(id: string): Promise<Feature> {
        const response = await fetchWithAuth<FeatureResponse>(`/features/${id}`);
        return response.data!.feature;
    },

    // Get all features for an idea
    async getByIdea(ideaId: string): Promise<Feature[]> {
        const response = await fetchWithAuth<FeaturesListResponse>(`/features/idea/${ideaId}`);
        return response.data!.features;
    },

    // Update a feature
    async update(id: string, data: UpdateFeatureInput): Promise<Feature> {
        const response = await fetchWithAuth<FeatureResponse>(`/features/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.data!.feature;
    },

    // Delete a feature
    async delete(id: string): Promise<void> {
        await fetchWithAuth(`/features/${id}`, {
            method: "DELETE",
        });
    },

    // Get version history
    async getVersions(id: string): Promise<FeatureVersion[]> {
        const response = await fetchWithAuth<any>(
            `/features/${id}/versions`
        );
        return response.data?.versions || (response.data as any) || [];
    },

    // Link feature to diagram
    async linkDiagram(featureId: string, diagramId: string): Promise<void> {
        await fetchWithAuth(`/features/${featureId}/diagrams/${diagramId}`, {
            method: "POST",
        });
    },

    // Unlink feature from diagram
    async unlinkDiagram(featureId: string, diagramId: string): Promise<void> {
        await fetchWithAuth(`/features/${featureId}/diagrams/${diagramId}`, {
            method: "DELETE",
        });
    },
};

// Task API functions
export const taskApi = {
    // Suggest tasks for a feature using AI
    async suggestForFeature(featureId: string): Promise<Task[]> {
        const response = await fetchWithAuth<TasksListResponse>(`/tasks/suggest/${featureId}`, {
            method: "POST",
        });
        return response.data!.tasks;
    },

    // Create a new task
    async create(data: CreateTaskInput): Promise<Task> {
        const response = await fetchWithAuth<TaskResponse>(`/tasks`, {
            method: "POST",
            body: JSON.stringify(data),
        });
        return response.data!.task;
    },

    // Get a single task
    async get(id: string): Promise<Task> {
        const response = await fetchWithAuth<TaskResponse>(`/tasks/${id}`);
        return response.data!.task;
    },

    // Get all tasks for a feature
    async getByFeature(featureId: string): Promise<Task[]> {
        const response = await fetchWithAuth<TasksListResponse>(`/tasks/feature/${featureId}`);
        return response.data!.tasks;
    },

    // Update a task
    async update(id: string, data: UpdateTaskInput): Promise<Task> {
        const response = await fetchWithAuth<TaskResponse>(`/tasks/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.data!.task;
    },

    // Update task status
    async updateStatus(id: string, status: string): Promise<Task> {
        const response = await fetchWithAuth<TaskResponse>(`/tasks/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        });
        return response.data!.task;
    },

    // Delete a task
    async delete(id: string): Promise<void> {
        await fetchWithAuth(`/tasks/${id}`, {
            method: "DELETE",
        });
    },

    // Get version history
    async getVersions(id: string): Promise<TaskVersion[]> {
        const response = await fetchWithAuth<any>(
            `/tasks/${id}/versions`
        );
        return response.data?.versions || (response.data as any) || [];
    },

    // Add dependency
    async addDependency(taskId: string, dependsOnId: string): Promise<void> {
        await fetchWithAuth(`/tasks/${taskId}/dependencies/${dependsOnId}`, {
            method: "POST",
        });
    },

    // Remove dependency
    async removeDependency(taskId: string, dependsOnId: string): Promise<void> {
        await fetchWithAuth(`/tasks/${taskId}/dependencies/${dependsOnId}`, {
            method: "DELETE",
        });
    },
};
