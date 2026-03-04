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

    async createWorkflowSteps(workflowId: string, stepsData: Prisma.WorkflowStepCreateManyInput[]) {
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
