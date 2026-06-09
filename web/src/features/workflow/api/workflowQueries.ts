import { workflowApi } from "./workflow.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UpdateWorkflowStepInput } from "@/features/workflow/types/models/workflow";

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
