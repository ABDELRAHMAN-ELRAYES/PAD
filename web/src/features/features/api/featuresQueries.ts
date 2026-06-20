import { featureApi, taskApi } from "./features.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    CreateFeatureInput,
    UpdateFeatureInput,
    CreateTaskInput,
    UpdateTaskInput,
} from "@/features/features/types/models/features";

// ============================================
// Feature Queries & Mutations
// ============================================

export const useFeaturesByIdea = (ideaId?: string) => {
  return useQuery({
    queryKey: ["features", "idea", ideaId],
    queryFn: () => featureApi.getByIdea(ideaId!),
    enabled: !!ideaId,
  });
};

export const useFeature = (id?: string) => {
  return useQuery({
    queryKey: ["features", "detail", id],
    queryFn: () => featureApi.get(id!),
    enabled: !!id,
  });
};

export const useFeatureVersions = (id?: string) => {
  return useQuery({
    queryKey: ["features", "versions", id],
    queryFn: () => featureApi.getVersions(id!),
    enabled: !!id,
  });
};

export const useExtractFeatures = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => featureApi.extractFromDocuments(ideaId),
    onSuccess: (_, ideaId) => {
      queryClient.invalidateQueries({ queryKey: ["features", "idea", ideaId] });
      toast.success("Features extracted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to extract features");
    },
  });
};

export const useCreateFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeatureInput) => featureApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["features", "idea", data.ideaId] });
      toast.success("Feature created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create feature");
    },
  });
};

export const useUpdateFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFeatureInput }) =>
      featureApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["features", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["features", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["features", "idea", data.ideaId] });
      toast.success("Feature updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update feature");
    },
  });
};

export const useDeleteFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; ideaId?: string }) => featureApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      toast.success("Feature deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete feature");
    },
  });
};

export const useLinkDiagram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, diagramId }: { featureId: string; diagramId: string }) =>
      featureApi.linkDiagram(featureId, diagramId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["features", "detail", variables.featureId] });
      toast.success("Diagram linked successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to link diagram");
    },
  });
};

export const useUnlinkDiagram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ featureId, diagramId }: { featureId: string; diagramId: string }) =>
      featureApi.unlinkDiagram(featureId, diagramId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["features", "detail", variables.featureId] });
      toast.success("Diagram unlinked successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to unlink diagram");
    },
  });
};

export const useRegenerateFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => featureApi.regenerate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["features", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["features", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["features", "idea", data.ideaId] });
      toast.success("Feature regenerated successfully using AI");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to regenerate feature");
    },
  });
};

export const useMergeFeatures = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, featureIds }: { ideaId: string; featureIds: string[] }) =>
      featureApi.merge(ideaId, featureIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["features", "idea", data.ideaId] });
      toast.success("Features merged successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to merge features");
    },
  });
};

export const useSplitFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, splits }: { id: string; splits: any[] }) =>
      featureApi.split(id, splits),
    onSuccess: (data) => {
      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["features", "idea", data[0].ideaId] });
      }
      toast.success("Feature split successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to split feature");
    },
  });
};

// ============================================
// Task Queries & Mutations
// ============================================

export const useTasksByFeature = (featureId?: string) => {
  return useQuery({
    queryKey: ["tasks", "feature", featureId],
    queryFn: () => taskApi.getByFeature(featureId!),
    enabled: !!featureId,
  });
};

export const useTask = (id?: string) => {
  return useQuery({
    queryKey: ["tasks", "detail", id],
    queryFn: () => taskApi.get(id!),
    enabled: !!id,
  });
};

export const useTaskVersions = (id?: string) => {
  return useQuery({
    queryKey: ["tasks", "versions", id],
    queryFn: () => taskApi.getVersions(id!),
    enabled: !!id,
  });
};

export const useSuggestTasks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) => taskApi.suggestForFeature(featureId),
    onSuccess: (_, featureId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "feature", featureId] });
      toast.success("Tasks suggested successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to suggest tasks");
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => taskApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "feature", data.featureId] });
      toast.success("Task created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create task");
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      taskApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "feature", data.featureId] });
      toast.success("Task updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update task");
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskApi.updateStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "feature", data.featureId] });
      toast.success(`Task status updated to ${data.status}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update task status");
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; featureId?: string }) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete task");
    },
  });
};

export const useAddTaskDependency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnId }: { taskId: string; dependsOnId: string }) =>
      taskApi.addDependency(taskId, dependsOnId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      toast.success("Dependency added successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to add dependency");
    },
  });
};

export const useRemoveTaskDependency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnId }: { taskId: string; dependsOnId: string }) =>
      taskApi.removeDependency(taskId, dependsOnId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", variables.taskId] });
      toast.success("Dependency removed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to remove dependency");
    },
  });
};
