import { documentApi } from "./documents.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UpdateDocumentInput, ExportFormat } from "@/features/documents/types/models/documents";

export const useDocumentsByIdea = (ideaId?: string) => {
  return useQuery({
    queryKey: ["documents", "idea", ideaId],
    queryFn: () => documentApi.getByIdeaId(ideaId!),
    enabled: !!ideaId,
  });
};

export const useDocument = (id?: string) => {
  return useQuery({
    queryKey: ["documents", "detail", id],
    queryFn: () => documentApi.getById(id!),
    enabled: !!id,
  });
};

export const useDocumentWithVersions = (id?: string) => {
  return useQuery({
    queryKey: ["documents", "full", id],
    queryFn: () => documentApi.getWithVersions(id!),
    enabled: !!id,
  });
};

export const useDocumentVersions = (id?: string) => {
  return useQuery({
    queryKey: ["documents", "versions", id],
    queryFn: () => documentApi.getVersions(id!),
    enabled: !!id,
  });
};

export const useGenerateDocuments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => documentApi.generate(ideaId),
    onSuccess: (_, ideaId) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "idea", ideaId] });
      toast.success("Documents generated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to generate documents");
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentInput }) =>
      documentApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "full", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "idea", data.ideaId] });
      toast.success("Document updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update document");
    },
  });
};

export const useRevertDocumentVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      documentApi.revertToVersion(id, version),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "full", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "idea", data.ideaId] });
      toast.success(`Reverted to version ${variables.version}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to revert document version");
    },
  });
};

export const useRegenerateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.regenerate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "full", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "versions", data.id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "idea", data.ideaId] });
      toast.success("Document regenerated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to regenerate document");
    },
  });
};

export const useExportDocument = () => {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: ExportFormat }) =>
      documentApi.export(id, format),
    onSuccess: () => {
      toast.success("Document exported successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Export failed");
    },
  });
};
