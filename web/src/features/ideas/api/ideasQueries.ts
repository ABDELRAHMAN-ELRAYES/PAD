import { ideaApi } from "./ideas.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateIdeaInput, RefineIdeaInput } from "../types/models/idea";

export const useIdeas = () => {
  return useQuery({
    queryKey: ["ideas"],
    queryFn: ideaApi.list,
  });
};

export const useIdea = (id?: string) => {
  return useQuery({
    queryKey: ["ideas", id],
    queryFn: () => ideaApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateIdea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIdeaInput) => ideaApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Idea created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create idea");
    },
  });
};

export const useAnalyzeIdea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ideaApi.analyze(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      queryClient.invalidateQueries({ queryKey: ["ideas", data.id] });
      toast.success("Idea analyzed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to analyze idea");
    },
  });
};

export const useRefineIdea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RefineIdeaInput }) =>
      ideaApi.refine(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      queryClient.invalidateQueries({ queryKey: ["ideas", data.id] });
      toast.success("Idea refined successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to refine idea");
    },
  });
};

export const useConfirmIdea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ideaApi.confirm(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      queryClient.invalidateQueries({ queryKey: ["ideas", data.id] });
      toast.success("Idea confirmed successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to confirm idea");
    },
  });
};
