import fs from "fs";
import { GuidelineRepository } from "./guideline.repository";
import { FileRepository } from "../file/file.repository";
import { QdrantClient } from "../../data-server-clients/qdrant";
import { chunkText } from "../../utils/chunker";
import AppError from "../../utils/app-error";
import { NextFunction } from "express";

export class GuidelineService {
    private static guidelineRepository = GuidelineRepository.getInstance();
    private static fileRepository = FileRepository.getInstance();

    static async createGuideline(userId: string, title: string, content: string) {
        if (!title || !content) {
            throw new AppError(400, "Title and content are required.");
        }

        // Create in Database
        const guideline = await this.guidelineRepository.createGuideline({
            userId,
            title,
            content,
        });

        try {
            // Chunk the text
            const chunks = await chunkText(content);
            if (chunks.length > 0) {
                // Generate embeddings and index in Qdrant
                await QdrantClient.upsertGuidelineChunks(userId, guideline.id, title, chunks);
            }
        } catch (error) {
            console.error("Failed to index guideline in Qdrant:", error);
            // We do not fail the database request, but log it
        }

        return guideline;
    }

    static async createGuidelineFromFile(
        userId: string,
        name: string,
        originalname: string,
        mimetype: string,
        path: string,
        size: number
    ) {
        // Create DB record for the file
        const fileRecord = await this.fileRepository.createFile({
            userId,
            name,
            originalname,
            mimetype,
            path,
            size,
        });

        let content = "";
        try {
            // Read content from disk
            content = await fs.promises.readFile(path, "utf-8");
            
            // Remove BOM if present
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.substr(1);
            }
        } catch (error) {
            console.error("Failed to read file from disk:", error);
            // Cleanup DB file record
            await this.fileRepository.deleteFile(fileRecord.id);
            throw new AppError(500, "Failed to read uploaded file content.");
        }

        // Create Guideline using original filename as title
        const guideline = await this.guidelineRepository.createGuideline({
            userId,
            fileId: fileRecord.id,
            title: originalname,
            content,
        });

        try {
            // Chunk the text
            const chunks = await chunkText(content);
            if (chunks.length > 0) {
                // Generate embeddings and index in Qdrant
                await QdrantClient.upsertGuidelineChunks(userId, guideline.id, originalname, chunks);
            }
        } catch (error) {
            console.error("Failed to index file guideline in Qdrant:", error);
        }

        return guideline;
    }

    static async listGuidelines(userId: string) {
        return await this.guidelineRepository.listGuidelinesByUserId(userId);
    }

    static async deleteGuideline(guidelineId: string, userId: string, next: NextFunction) {
        const guideline = await this.guidelineRepository.getGuidelineById(guidelineId);
        if (!guideline) {
            return next(new AppError(404, "Guideline not found."));
        }

        if (guideline.userId !== userId) {
            return next(new AppError(403, "You do not have permission to delete this guideline."));
        }

        // Delete from Qdrant vector database
        try {
            await QdrantClient.deleteGuidelinePoints(guidelineId);
        } catch (error) {
            console.error("Failed to delete guideline points from Qdrant:", error);
        }

        // If file exists, delete from disk
        if (guideline.file) {
            try {
                if (fs.existsSync(guideline.file.path)) {
                    await fs.promises.unlink(guideline.file.path);
                }
            } catch (error) {
                console.error("Failed to delete file from disk:", error);
            }
        }

        // Delete from DB (foreign keys cascade)
        await this.guidelineRepository.deleteGuideline(guidelineId);
        return { status: "success" };
    }

    static async downloadFile(fileId: string, userId: string, next: NextFunction) {
        const fileRecord = await this.fileRepository.getFileById(fileId);
        if (!fileRecord) {
            return next(new AppError(404, "File not found."));
        }

        if (fileRecord.userId !== userId) {
            return next(new AppError(403, "You do not have permission to download this file."));
        }

        if (!fs.existsSync(fileRecord.path)) {
            return next(new AppError(404, "Physical file does not exist on disk."));
        }

        return fileRecord;
    }
}

export default GuidelineService;
