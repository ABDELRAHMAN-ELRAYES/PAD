import { useState, useEffect, useCallback } from "react";
import { featureApi, taskApi } from "../api/features.api";
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
    const [feature, setFeature] = useState<Feature | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFeatureAndTasks = useCallback(async () => {
        try {
            setIsLoading(true);
            const [featureData, tasksData] = await Promise.all([
                featureApi.get(featureId),
                taskApi.getByFeature(featureId),
            ]);
            setFeature(featureData);
            setTasks(tasksData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [featureId]);

    useEffect(() => {
        if (featureId) {
            loadFeatureAndTasks();
        }
    }, [featureId, loadFeatureAndTasks]);

    const handleSuggestTasks = async () => {
        setIsSuggesting(true);
        setError(null);
        try {
            const suggested = await taskApi.suggestForFeature(featureId);
            setTasks(suggested);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to suggest tasks");
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, status: string) => {
        try {
            const updated = await taskApi.updateStatus(taskId, status);
            setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update task status");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await taskApi.delete(taskId);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete task");
        }
    };

    return {
        feature,
        tasks,
        isLoading,
        isSuggesting,
        error,
        setError,
        loadFeatureAndTasks,
        handleSuggestTasks,
        handleUpdateTaskStatus,
        handleDeleteTask,
    };
}
