import { workflowApi, handoffApi } from "./workflow.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UpdateWorkflowStepInput, UpdateArtifactInput } from "@/features/workflow/types/models/workflow";

export const useWorkflowByIdea = (ideaId?: string) => {
  return useQuery({
    queryKey: ["workflow", "idea", ideaId],
    queryFn: () => workflowApi.getByIdeaId(ideaId!),
    enabled: !!ideaId,
  });
};

export const useGenerateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => workflowApi.generate(ideaId),
    onSuccess: (_, ideaId) => {
      queryClient.invalidateQueries({ queryKey: ["workflow", "idea", ideaId] });
      toast.success("Workflow generated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to generate workflow");
    },
  });
};

export const useUpdateWorkflowStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: UpdateWorkflowStepInput }) =>
      workflowApi.updateStep(stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
      toast.success("Workflow step updated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update workflow step");
    },
  });
};

export const useExportWorkflow = () => {
  return useMutation({
    mutationFn: (workflowId: string) => workflowApi.export(workflowId),
    onSuccess: () => {
      toast.success("Workflow exported successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Export failed");
    },
  });
};

// ============================================================
// Handoff Package Queries
// ============================================================

export const useHandoffByIdea = (ideaId?: string) => {
  return useQuery({
    queryKey: ["handoff", "idea", ideaId],
    queryFn: () => handoffApi.getByIdea(ideaId!),
    enabled: !!ideaId,
    retry: false,
  });
};

export const useArtifact = (artifactId?: string | null) => {
  return useQuery({
    queryKey: ["handoff", "artifact", artifactId],
    queryFn: () => handoffApi.getArtifact(artifactId!),
    enabled: !!artifactId,
  });
};

export const useUpdateArtifact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artifactId, data }: { artifactId: string; data: UpdateArtifactInput }) =>
      handoffApi.updateArtifact(artifactId, data),
    onSuccess: (_, { artifactId }) => {
      queryClient.invalidateQueries({ queryKey: ["handoff", "artifact", artifactId] });
      queryClient.invalidateQueries({ queryKey: ["handoff"] });
      toast.success("Artifact saved");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save artifact");
    },
  });
};

export const useGetMasterPrompt = () => {
  return useMutation({
    mutationFn: (packageId: string) => handoffApi.getMasterPrompt(packageId),
    onError: (error: any) => {
      toast.error(error?.message || "Failed to fetch master prompt");
    },
  });
};
