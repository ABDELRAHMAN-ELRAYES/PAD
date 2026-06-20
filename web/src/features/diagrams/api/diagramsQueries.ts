import { diagramApi } from "./diagrams.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UpdateDiagramInput } from "@/features/diagrams/types/models/diagrams";

export const useDiagramsByIdea = (ideaId?: string) => {
  return useQuery({
    queryKey: ["diagrams", "idea", ideaId],
    queryFn: () => diagramApi.getByIdeaId(ideaId!),
    enabled: !!ideaId,
  });
};

export const useDiagram = (id?: string) => {
  return useQuery({
    queryKey: ["diagrams", "detail", id],
    queryFn: () => diagramApi.getById(id!),
    enabled: !!id,
  });
};

export const useDiagramWithVersions = (id?: string) => {
  return useQuery({
    queryKey: ["diagrams", "full", id],
    queryFn: () => diagramApi.getWithVersions(id!),
    enabled: !!id,
  });
};

export const useDiagramVersions = (id?: string) => {
  return useQuery({
    queryKey: ["diagrams", "versions", id],
    queryFn: () => diagramApi.getVersions(id!),
    enabled: !!id,
  });
};

export const useGenerateDiagrams = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => diagramApi.generate(ideaId),
    onSuccess: (_, ideaId) => {
      queryClient.invalidateQueries({ queryKey: ["diagrams", "idea", ideaId] });
      toast.success("Diagrams generated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to generate diagrams");
    },
  });
};

export const useUpdateDiagram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiagramInput }) =>
      diagramApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagrams", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "full", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "idea", data.ideaId] });
      toast.success("Diagram updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update diagram");
    },
  });
};



export const useRepairDiagram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, code, errorMessage }: { id: string; code: string; errorMessage: string }) =>
      diagramApi.repair(id, code, errorMessage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagrams", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "full", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "idea", data.ideaId] });
      toast.success("Diagram repaired successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to repair diagram");
    },
  });
};

export const useImportDiagram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, code, title }: { id: string; code: string; title?: string }) =>
      diagramApi.import(id, code, title),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagrams", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "full", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["diagrams", "idea", data.ideaId] });
      toast.success("Diagram imported successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to import diagram");
    },
  });
};
