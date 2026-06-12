import PrismaClientSingleton from "../../data-server-clients/prisma-client";
import { PrismaClient } from "@prisma/client";
import AppError from "../../utils/app-error";
import { ProjectIRSchema } from "./types/ir.types";

class IRRepository {
  private prisma: PrismaClient;
  private static instance: IRRepository;

  private constructor() {
    this.prisma = PrismaClientSingleton.getPrismaClient();
  }

  static getInstance(): IRRepository {
    if (!IRRepository.instance) {
      IRRepository.instance = new IRRepository();
    }
    return IRRepository.instance;
  }

  async getIRByIdeaId(ideaId: string) {
    try {
      return await this.prisma.projectIR.findUnique({
        where: { ideaId },
        include: {
          versions: {
            orderBy: { version: "desc" },
          },
        },
      });
    } catch (error) {
      console.error("Fetch IR by ideaId error:", error);
      throw new AppError(500, "Failed to fetch Project IR");
    }
  }

  async createIR(ideaId: string, schemaData: ProjectIRSchema) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const projectIR = await tx.projectIR.create({
          data: {
            ideaId,
            version: 1,
            schemaData: schemaData as any,
          },
        });

        await tx.projectIRVersion.create({
          data: {
            projectIRId: projectIR.id,
            version: 1,
            schemaData: schemaData as any,
            changelog: "Initial IR generation",
          },
        });

        return projectIR;
      });
    } catch (error) {
      console.error("Create IR error:", error);
      throw new AppError(500, "Failed to create Project IR");
    }
  }

  async updateIR(ideaId: string, schemaData: ProjectIRSchema, changelog?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.projectIR.findUnique({
          where: { ideaId },
        });

        if (!existing) {
          throw new AppError(404, "Project IR not found");
        }

        const nextVersion = existing.version + 1;

        const updated = await tx.projectIR.update({
          where: { ideaId },
          data: {
            version: nextVersion,
            schemaData: schemaData as any,
          },
        });

        await tx.projectIRVersion.create({
          data: {
            projectIRId: existing.id,
            version: nextVersion,
            schemaData: schemaData as any,
            changelog: changelog || "IR modified manually",
          },
        });

        return updated;
      });
    } catch (error) {
      console.error("Update IR error:", error);
      throw error instanceof AppError ? error : new AppError(500, "Failed to update Project IR");
    }
  }

  async getIRVersion(projectIRId: string, version: number) {
    try {
      return await this.prisma.projectIRVersion.findUnique({
        where: {
          projectIRId_version: {
            projectIRId,
            version,
          },
        },
      });
    } catch (error) {
      console.error("Fetch IR version error:", error);
      throw new AppError(500, "Failed to fetch Project IR version");
    }
  }
}

export default IRRepository;
