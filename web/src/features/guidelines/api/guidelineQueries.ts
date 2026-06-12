import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guidelineApi } from "./guideline.api";

export const guidelineKeys = {
  all: ["guidelines"] as const,
};

export function useGuidelines() {
  return useQuery({
    queryKey: guidelineKeys.all,
    queryFn: async () => {
      return await guidelineApi.list();
    },
  });
}

export function useCreateGuideline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      return await guidelineApi.create(title, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guidelineKeys.all });
    },
  });
}

export function useUploadGuideline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      return await guidelineApi.upload(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guidelineKeys.all });
    },
  });
}

export function useDeleteGuideline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await guidelineApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guidelineKeys.all });
    },
  });
}
