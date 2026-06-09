import { useState } from "react";
import {
    useFeature,
    useTasksByFeature,
    useSuggestTasks,
    useUpdateTaskStatus,
    useDeleteTask,
} from "../api/featuresQueries";
import { Feature, Task } from "../types/models/features";

export interface UseFeatureDetailPageReturn {
    feature: Feature | null;
    tasks: Task[];
    isLoading: boolean;
    isSuggesting: boolean;
    error: string | null;
    setError: (error: string | null) => void;
    loadFeatureAndTasks: () => Promise<void>;
    handleSuggestTasks: () => Promise<void>;
    handleUpdateTaskStatus: (taskId: string, status: string) => Promise<void>;
    handleDeleteTask: (taskId: string) => Promise<void>;
}

export function useFeatureDetailPage(featureId: string): UseFeatureDetailPageReturn {
    const { data: feature, isLoading: isFeatureLoading, refetch: refetchFeature } = useFeature(featureId);
    const { data: tasksData, isLoading: isTasksLoading, refetch: refetchTasks } = useTasksByFeature(featureId);

    const [error, setError] = useState<string | null>(null);

    const suggestTasksMutation = useSuggestTasks();
    const updateTaskStatusMutation = useUpdateTaskStatus();
    const deleteTaskMutation = useDeleteTask();

    const tasks = tasksData || [];
    const isLoading = isFeatureLoading || isTasksLoading;

    const loadFeatureAndTasks = async () => {
        refetchFeature();
        refetchTasks();
    };

    const handleSuggestTasks = async () => {
        setError(null);
        suggestTasksMutation.mutate(featureId, {
            onSuccess: () => {
                refetchTasks();
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to suggest tasks");
            }
        });
    };

    const handleUpdateTaskStatus = async (taskId: string, status: string) => {
        setError(null);
        updateTaskStatusMutation.mutate({
            id: taskId,
            status
        }, {
            onSuccess: () => {
                refetchTasks();
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to update task status");
            }
        });
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        setError(null);
        deleteTaskMutation.mutate({
            id: taskId,
            featureId
        }, {
            onSuccess: () => {
                refetchTasks();
            },
            onError: (err: any) => {
                setError(err?.message || "Failed to delete task");
            }
        });
    };

    return {
        feature: feature || null,
        tasks,
        isLoading,
        isSuggesting: suggestTasksMutation.isPending,
        error: error || (suggestTasksMutation.error as Error)?.message || (updateTaskStatusMutation.error as Error)?.message || (deleteTaskMutation.error as Error)?.message || null,
        setError,
        loadFeatureAndTasks,
        handleSuggestTasks,
        handleUpdateTaskStatus,
        handleDeleteTask,
    };
}
