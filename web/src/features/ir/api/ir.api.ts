import { apiClient } from "@/api/client";
import { ProjectIR, ProjectIRSchema } from "../types/ir";
import { ApiResponse } from "@/features/ideas";


export const irApi = {
  async getByIdeaId(ideaId: string): Promise<ProjectIR> {
    const response = await apiClient.get<ApiResponse<{ ir: ProjectIR }>>(`/ideas/${ideaId}/ir`);
    return response.data!.ir;
  },

  async generateInitial(ideaId: string): Promise<ProjectIR> {
    const response = await apiClient.post<ApiResponse<{ ir: ProjectIR }>>(`/ideas/${ideaId}/ir/generate`);
    return response.data!.ir;
  },

  async update(
    ideaId: string,
    schemaData: ProjectIRSchema,
    changelog?: string
  ): Promise<{ updated: ProjectIR; warnings: string[] }> {
    const response = await apiClient.post<ApiResponse<{ updated: ProjectIR; warnings: string[] }>>(`/ideas/${ideaId}/ir`, {
      schemaData,
      changelog,
    });
    return response.data!;
  },

  async patch(ideaId: string, requestText: string): Promise<ProjectIR> {
    const response = await apiClient.post<ApiResponse<{ ir: ProjectIR }>>(`/ideas/${ideaId}/ir/patch`, {
      requestText,
    });
    return response.data!.ir;
  },

  async compile(
    ideaId: string,
    selectedDiagrams: string[]
  ): Promise<{ openApiSpec: string; documents: any[]; diagrams: any[] }> {
    const response = await apiClient.post<ApiResponse<{ openApiSpec: string; documents: any[]; diagrams: any[] }>>(
      `/ideas/${ideaId}/ir/compile`,
      { selectedDiagrams }
    );
    return response.data!;
  },
};
