import { PrismaClient } from "@prisma/client";
import {
    IIterationRepository,
    IIterationSession,
    IIterationMessage,
    IIterationSuggestion,
    ICreateIterationSessionData,
    ICreateIterationMessageData,
    ICreateIterationSuggestionData,
} from "./types/IIteration";
import AppError from "@/utils/app-error";
import PrismaClientSingleton from "@/data-server-clients/prisma-client";

export default class IterationRepository implements IIterationRepository {
    private static instance: IterationRepository;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = PrismaClientSingleton.getPrismaClient();
    }

    public static getInstance(): IterationRepository {
        if (!IterationRepository.instance) {
            IterationRepository.instance = IterationRepository.instance = new IterationRepository();
        }
        return IterationRepository.instance;
    }

    async createSession(data: ICreateIterationSessionData): Promise<IIterationSession> {
        try {
            return await this.prisma.iterationSession.create({
                data: {
                    ideaId: data.ideaId,
                    status: "active",
                },
            }) as IIterationSession;
        } catch (error) {
            throw new AppError(500, "Failed to create iteration session");
        }
    }

    async getSessionByIdeaId(ideaId: string): Promise<IIterationSession | null> {
        try {
            return await this.prisma.iterationSession.findUnique({
                where: { ideaId },
                include: {
                    messages: {
                        include: {
                            suggestion: {
                                include: {
                                    actions: true
                                }
                            }
                        },
                        orderBy: { createdAt: "asc" }
                    }
                }
            }) as IIterationSession | null;
        } catch (error) {
            throw new AppError(500, "Failed to get iteration session");
        }
    }

    async addMessage(data: ICreateIterationMessageData): Promise<IIterationMessage> {
        try {
            return await this.prisma.iterationMessage.create({
                data: {
                    sessionId: data.sessionId,
                    role: data.role,
                    content: data.content,
                },
            }) as IIterationMessage;
        } catch (error) {
            throw new AppError(500, "Failed to add iteration message");
        }
    }

    async createSuggestion(data: ICreateIterationSuggestionData): Promise<IIterationSuggestion> {
        try {
            return await this.prisma.iterationSuggestion.create({
                data: {
                    messageId: data.messageId,
                    title: data.title,
                    summary: data.summary,
                    status: "pending",
                    actions: {
                        create: data.actions.map(action => ({
                            module: action.module,
                            targetId: action.targetId,
                            actionType: action.actionType,
                            newContent: action.newContent
                        }))
                    }
                },
                include: {
                    actions: true
                }
            }) as IIterationSuggestion;
        } catch (error) {
            throw new AppError(500, "Failed to create iteration suggestion");
        }
    }

    async updateSuggestionStatus(id: string, status: string): Promise<IIterationSuggestion> {
        try {
            return await this.prisma.iterationSuggestion.update({
                where: { id },
                data: { status },
                include: {
                    actions: true
                }
            }) as IIterationSuggestion;
        } catch (error) {
            throw new AppError(500, "Failed to update suggestion status");
        }
    }

    async getMessagesBySessionId(sessionId: string): Promise<IIterationMessage[]> {
        try {
            return await this.prisma.iterationMessage.findMany({
                where: { sessionId },
                include: {
                    suggestion: {
                        include: {
                            actions: true
                        }
                    }
                },
                orderBy: { createdAt: "asc" }
            }) as IIterationMessage[];
        } catch (error) {
            throw new AppError(500, "Failed to get iteration messages");
        }
    }

    async getSuggestionById(id: string): Promise<IIterationSuggestion | null> {
        try {
            return await this.prisma.iterationSuggestion.findUnique({
                where: { id },
                include: {
                    actions: true,
                    message: true
                }
            }) as IIterationSuggestion | null;
        } catch (error) {
            throw new AppError(500, "Failed to get iteration suggestion");
        }
    }

    async getMessageById(id: string): Promise<IIterationMessage | null> {
        try {
            return await this.prisma.iterationMessage.findUnique({
                where: { id }
            }) as IIterationMessage | null;
        } catch (error) {
            throw new AppError(500, "Failed to get iteration message");
        }
    }

    async getSessionBySessionId(id: string): Promise<IIterationSession | null> {
        try {
            return await this.prisma.iterationSession.findUnique({
                where: { id }
            }) as IIterationSession | null;
        } catch (error) {
            throw new AppError(500, "Failed to get iteration session");
        }
    }

    async getSessionByMessageId(messageId: string): Promise<IIterationSession | null> {
        try {
            const message = await this.prisma.iterationMessage.findUnique({
                where: { id: messageId },
                include: { session: true }
            });
            return message?.session as IIterationSession | null;
        } catch (error) {
            throw new AppError(500, "Failed to get session by message id");
        }
    }
}
