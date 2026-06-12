import PrismaClientSingleton from "../../data-server-clients/prisma-client";
import { PrismaClient } from "@prisma/client";
import AppError from "../../utils/app-error";

export class FileRepository {
    private prisma: PrismaClient;
    private static instance: FileRepository;

    private constructor() {
        this.prisma = PrismaClientSingleton.getPrismaClient();
    }

    static getInstance(): FileRepository {
        if (!FileRepository.instance) {
            FileRepository.instance = new FileRepository();
        }
        return FileRepository.instance;
    }

    async createFile(data: {
        userId: string;
        name: string;
        originalname: string;
        mimetype: string;
        path: string;
        size: number;
    }) {
        try {
            return await this.prisma.file.create({
                data: {
                    userId: data.userId,
                    name: data.name,
                    originalname: data.originalname,
                    mimetype: data.mimetype,
                    path: data.path,
                    size: data.size,
                },
            });
        } catch (error) {
            console.error("Create file error:", error);
            throw new AppError(500, "Failed to create file record in DB");
        }
    }

    async getFileById(fileId: string) {
        try {
            return await this.prisma.file.findUnique({
                where: { id: fileId },
            });
        } catch (error) {
            console.error("Get file error:", error);
            throw new AppError(500, "Failed to fetch file record");
        }
    }

    async deleteFile(fileId: string) {
        try {
            return await this.prisma.file.delete({
                where: { id: fileId },
            });
        } catch (error) {
            console.error("Delete file error:", error);
            throw new AppError(500, "Failed to delete file record");
        }
    }
}

export default FileRepository;
