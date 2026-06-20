import { PrismaClient, Prisma } from "@prisma/client";

export class WorkflowRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createWorkflow(ideaId: string) {
        return await this.prisma.workflow.create({
            data: {
                ideaId,
            },
            include: {
                steps: true,
            },
        });
    }

    async getWorkflowByIdeaId(ideaId: string) {
        return await this.prisma.workflow.findUnique({
            where: { ideaId },
            include: {
                steps: {
                    include: {
                        dependencies: {
                            include: {
                                dependsOn: true,
                            },
                        },
                    },
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        });
    }

    async getWorkflowById(id: string) {
        return await this.prisma.workflow.findUnique({
            where: { id },
            include: {
                steps: {
                    include: {
                        dependencies: true,
                    },
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        });
    }

    async updateWorkflowStatus(id: string, status: string) {
        return await this.prisma.workflow.update({
            where: { id },
            data: { status },
        });
    }

    async createWorkflowSteps(_workflowId: string, stepsData: Prisma.WorkflowStepCreateManyInput[]) {
        return await this.prisma.workflowStep.createMany({
            data: stepsData,
        });
    }

    async getWorkflowStepsByWorkflowId(workflowId: string) {
        return await this.prisma.workflowStep.findMany({
            where: { workflowId },
            include: {
                dependencies: {
                    include: {
                        dependsOn: true,
                    },
                },
            },
            orderBy: {
                order: "asc",
            },
        });
    }

    async getWorkflowStepById(id: string) {
        return await this.prisma.workflowStep.findUnique({
            where: { id },
            include: {
                dependencies: {
                    include: {
                        dependsOn: true,
                    },
                },
            },
        });
    }

    async createStepDependencies(dependenciesData: Prisma.WorkflowStepDependencyCreateManyInput[]) {
        return await this.prisma.workflowStepDependency.createMany({
            data: dependenciesData,
            skipDuplicates: true,
        });
    }

    async updateWorkflowStep(id: string, data: Prisma.WorkflowStepUpdateInput) {
        return await this.prisma.workflowStep.update({
            where: { id },
            data,
            include: {
                dependencies: {
                    include: {
                        dependsOn: true
                    }
                }
            }
        });
    }

    async createWorkflowStepVersion(data: Prisma.WorkflowStepVersionUncheckedCreateInput) {
        return await this.prisma.workflowStepVersion.create({
            data,
        });
    }

    async getLatestStepVersion(stepId: string) {
        const version = await this.prisma.workflowStepVersion.findFirst({
            where: { stepId },
            orderBy: { version: "desc" },
        });
        return version ? version.version : 0;
    }

    async getStepVersions(stepId: string) {
        return await this.prisma.workflowStepVersion.findMany({
            where: { stepId },
            orderBy: { version: "desc" },
        });
    }
}

export const workflowRepository = new WorkflowRepository();

// ============================================================
// Handoff Repository
// ============================================================

export class HandoffRepository {
    private prisma: any;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createPackage(ideaId: string, version: number) {
        return await this.prisma.handoffPackage.create({
            data: { ideaId, version, status: "generating" },
        });
    }

    async updatePackageStatus(id: string, status: string, zipPath?: string) {
        return await this.prisma.handoffPackage.update({
            where: { id },
            data: { status, ...(zipPath !== undefined && { zipPath }) },
        });
    }

    async getLatestPackageByIdeaId(ideaId: string) {
        return await this.prisma.handoffPackage.findFirst({
            where: { ideaId },
            orderBy: { version: "desc" },
            include: {
                artifacts: {
                    select: {
                        id: true,
                        filePath: true,
                        title: true,
                        fileType: true,
                        createdAt: true,
                        updatedAt: true,
                        packageId: true,
                        content: false,
                    },
                },
            },
        });
    }

    async getPackageWithArtifacts(packageId: string) {
        return await this.prisma.handoffPackage.findUnique({
            where: { id: packageId },
            include: { artifacts: true },
        });
    }

    async getNextVersion(ideaId: string): Promise<number> {
        const latest = await this.prisma.handoffPackage.findFirst({
            where: { ideaId },
            orderBy: { version: "desc" },
            select: { version: true },
        });
        return (latest?.version ?? 0) + 1;
    }

    async upsertArtifact(
        packageId: string,
        filePath: string,
        title: string,
        content: string,
        fileType: string
    ) {
        const existing = await this.prisma.handoffArtifact.findUnique({
            where: { packageId_filePath: { packageId, filePath } },
        });

        if (existing) {
            return await this.prisma.handoffArtifact.update({
                where: { id: existing.id },
                data: { content, title, fileType },
            });
        }

        return await this.prisma.handoffArtifact.create({
            data: { packageId, filePath, title, content, fileType },
        });
    }

    async getArtifactById(artifactId: string) {
        return await this.prisma.handoffArtifact.findUnique({
            where: { id: artifactId },
        });
    }

    async getArtifactsByPackageId(packageId: string) {
        return await this.prisma.handoffArtifact.findMany({
            where: { packageId },
        });
    }

    async updateArtifactContent(artifactId: string, content: string, changelog?: string) {
        // Snapshot current version first
        const artifact = await this.prisma.handoffArtifact.findUnique({
            where: { id: artifactId },
            include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        });
        if (!artifact) throw new Error("Artifact not found");

        const nextVersion = (artifact.versions[0]?.version ?? 0) + 1;

        await this.prisma.handoffArtifactVersion.create({
            data: {
                artifactId,
                version: nextVersion,
                content: artifact.content, // snapshot old content
                changelog: changelog ?? "Manual edit",
            },
        });

        return await this.prisma.handoffArtifact.update({
            where: { id: artifactId },
            data: { content },
        });
    }
}

export const handoffRepository = new HandoffRepository();
