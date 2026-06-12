import { apiClient } from "@/api/client";
import type { Guideline } from "../types/guideline";

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
}

export const guidelineApi = {
  async list(): Promise<Guideline[]> {
    const response = await apiClient.get<ApiResponse<{ guidelines: Guideline[] }>>("/guidelines");
    return response.data?.guidelines ?? [];
  },

  async create(title: string, content: string): Promise<Guideline> {
    const response = await apiClient.post<ApiResponse<{ guideline: Guideline }>>("/guidelines", {
      title,
      content,
    });
    return response.data!.guideline;
  },

  async upload(file: File): Promise<Guideline> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiResponse<{ guideline: Guideline }>>(
      "/guidelines/upload",
      formData
    );
    return response.data!.guideline;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/guidelines/${id}`);
  },

  async download(fileId: string): Promise<Blob> {
    const response = await apiClient.get<Response>(
      `/guidelines/files/${fileId}/download`,
      {},
      true
    );
    return response.blob();
  },
};
