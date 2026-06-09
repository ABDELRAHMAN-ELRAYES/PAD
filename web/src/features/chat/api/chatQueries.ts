import { iterationApi, planApi } from "./chat.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useIterationSession = (ideaId?: string) => {
  return useQuery({
    queryKey: ["chat", "session", ideaId],
    queryFn: () => iterationApi.getSession(ideaId!),
    enabled: !!ideaId,
  });
};

export const useSendIterationMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, content }: { ideaId: string; content: string }) =>
      iterationApi.sendMessage(ideaId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "session", variables.ideaId] });
      toast.success("Message sent");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to send message");
    },
  });
};

export const useApproveSuggestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) => iterationApi.approveSuggestion(suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      toast.success("Suggestion approved");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to approve suggestion");
    },
  });
};

export const useRejectSuggestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) => iterationApi.rejectSuggestion(suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      toast.success("Suggestion rejected");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to reject suggestion");
    },
  });
};

export const useGeneratePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, content }: { ideaId: string; content: string }) =>
      planApi.generate(ideaId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "plan-history", variables.ideaId] });
      toast.success("Plan generated");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to generate plan");
    },
  });
};

export const usePlan = (planId?: string) => {
  return useQuery({
    queryKey: ["chat", "plan", planId],
    queryFn: () => planApi.getById(planId!),
    enabled: !!planId,
  });
};

export const useConfirmPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, planId }: { ideaId: string; planId: string }) =>
      planApi.confirm(ideaId, planId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "plan", variables.planId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "plan-history", variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Plan executed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to confirm plan");
    },
  });
};

export const usePlanHistory = (ideaId?: string) => {
  return useQuery({
    queryKey: ["chat", "plan-history", ideaId],
    queryFn: () => planApi.getHistory(ideaId!),
    enabled: !!ideaId,
  });
};

export const useRollbackPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, planId }: { ideaId: string; planId: string }) =>
      planApi.rollback(ideaId, planId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "plan", variables.planId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "plan-history", variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Plan rolled back successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to rollback plan");
    },
  });
};
