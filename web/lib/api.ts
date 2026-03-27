import {
    Idea,
    CreateIdeaInput,
    RefineIdeaInput,
    ApiResponse,
    IdeaResponse,
    IdeasListResponse,
    Document,
    DocumentWithVersions,
    DocumentVersion,
    UpdateDocumentInput,
    DocumentResponse,
    DocumentsListResponse,
    DocumentVersionsResponse,
    ExportFormat,
    Diagram,
    DiagramWithVersions,
    DiagramVersion,
    UpdateDiagramInput,
    DiagramResponse,
    DiagramsListResponse,
    DiagramVersionsResponse,
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
    Workflow,
    WorkflowResponse,
    WorkflowStep,
    UpdateWorkflowStepInput,
    WorkflowExportResponse,
    IterationSession,
    IterationSessionResponse,
    IterationMessage,
    IterationMessageResponse,
    IterationSuggestion,
    IterationSuggestionResponse,
} from "./types/idea";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Helper to make authenticated requests
async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include", // Include cookies for JWT auth
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "An error occurred");
    }

    return data;
}

// Helper to make streaming requests
async function streamRequest(
    endpoint: string,
    onChunk: (data: any) => void,
    options: RequestInit = {}
): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "An error occurred" }));
        throw new Error(error.message || "An error occurred");
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("Response body is null");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                try {
                    const data = JSON.parse(trimmed);
                    onChunk(data);
                } catch (e) {
                    console.warn("Failed to parse JSON stream chunk:", trimmed, e);
                }
            }
        }
        
        // Final buffer flush
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                onChunk(data);
            } catch (e) {
                // ignore
            }
        }
    } finally {
        reader.releaseLock();
    }
}

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

// Document API functions
export const documentApi = {
    // Generate PRD & BRD for an idea (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/documents/generate/${ideaId}`, onChunk, {
            method: "POST",
        });
    },

    // Generate PRD & BRD for an idea (Legacy/Sync)
    async generate(ideaId: string): Promise<Document[]> {
        const response = await fetchWithAuth<DocumentsListResponse>(`/documents/generate/${ideaId}`, {
            method: "POST",
        });
        return response.data!.documents;
    },

    // Get a document by ID
    async getById(id: string): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}`);
        return response.data!.document;
    },

    // Get document with versions
    async getWithVersions(id: string): Promise<DocumentWithVersions> {
        const response = await fetchWithAuth<{ document: DocumentWithVersions }>(`/documents/${id}/full`);
        return response.data!.document;
    },

    // Get all documents for an idea
    async getByIdeaId(ideaId: string): Promise<Document[]> {
        const response = await fetchWithAuth<DocumentsListResponse>(`/documents/idea/${ideaId}`);
        return response.data!.documents;
    },

    // Update a document
    async update(id: string, data: UpdateDocumentInput): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.data!.document;
    },

    // Get version history
    async getVersions(id: string): Promise<DocumentVersion[]> {
        const response = await fetchWithAuth<DocumentVersionsResponse>(`/documents/${id}/versions`);
        return response.data!.versions;
    },

    // Revert to a specific version
    async revertToVersion(id: string, version: number): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}/revert/${version}`, {
            method: "POST",
        });
        return response.data!.document;
    },

    // Regenerate a document (Streaming)
    async regenerateStream(id: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/documents/${id}/regenerate`, onChunk, {
            method: "POST",
        });
    },

    // Regenerate a document
    async regenerate(id: string): Promise<Document> {
        const response = await fetchWithAuth<DocumentResponse>(`/documents/${id}/regenerate`, {
            method: "POST",
        });
        return response.data!.document;
    },

    // Export document
    async export(id: string, format: ExportFormat): Promise<Blob> {
        const response = await fetch(`${API_BASE_URL}/documents/${id}/export/${format}`, {
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Export failed");
        }
        return response.blob();
    },
};

// Diagram API functions
export const diagramApi = {
    // Generate diagrams for an idea (Streaming)
    async generateStream(ideaId: string, onChunk: (data: any) => void): Promise<void> {
        await streamRequest(`/diagrams/generate/${ideaId}`, onChunk, {
            method: "POST",
        });
    },

    // Generate diagrams for an idea (Legacy/Sync)
    async generate(ideaId: string): Promise<Diagram[]> {
        const response = await fetchWithAuth<DiagramsListResponse>(`/diagrams/generate/${ideaId}`, {
            method: "POST",
        });
        return response.data!.diagrams;
    },

    // Get all diagrams for an idea
    async getByIdeaId(ideaId: string): Promise<Diagram[]> {
        const response = await fetchWithAuth<DiagramsListResponse>(`/diagrams/idea/${ideaId}`);
        return response.data!.diagrams;
    },

    // Get a single diagram
    async getById(id: string): Promise<Diagram> {
        const response = await fetchWithAuth<DiagramResponse>(`/diagrams/${id}`);
        return response.data!.diagram;
    },

    // Get diagram with versions
    async getWithVersions(id: string): Promise<DiagramWithVersions> {
        const response = await fetchWithAuth<{ diagram: DiagramWithVersions }>(`/diagrams/${id}/full`);
        return response.data!.diagram;
    },

    // Update a diagram
    async update(id: string, data: UpdateDiagramInput): Promise<Diagram> {
        const response = await fetchWithAuth<DiagramResponse>(`/diagrams/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.data!.diagram;
    },

    // Get version history
    async getVersions(id: string): Promise<DiagramVersion[]> {
        const response = await fetchWithAuth<DiagramVersionsResponse>(`/diagrams/${id}/versions`);
        return response.data!.versions;
    },

    // Regenerate a diagram
    async regenerate(id: string): Promise<Diagram> {
        const response = await fetchWithAuth<DiagramResponse>(`/diagrams/${id}/regenerate`, {
            method: "POST",
        });
        return response.data!.diagram;
    },
};

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

// ============================================
// Workflow Generation & IDE Integration API (Module 5)
// ============================================
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

// ============================================
// Iterative Feedback & Chat-Based Updates API (Module 6)
// ============================================
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
};
