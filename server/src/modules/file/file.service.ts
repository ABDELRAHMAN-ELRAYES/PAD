import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { FileRepository } from "./file.repository";
import { FileParserService } from "./file-parser.service";
import { IFile } from "./types/file.interface";
import * as fs from "fs/promises";

@Injectable()
export class FileService {
  constructor(
    private readonly fileRepo: FileRepository,
    private readonly fileParser: FileParserService,
  ) {}

  async saveUploadedFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<IFile> {
    return this.fileRepo.createFile({
      userId,
      name: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      path: file.path,
      size: file.size,
    });
  }

  async getFileById(fileId: string, userId: string): Promise<IFile> {
    const file = await this.fileRepo.findById(fileId);
    if (!file) {
      throw new NotFoundException("File not found");
    }
    if (file.userId !== userId) {
      throw new ForbiddenException("Unauthorized access to this file");
    }
    return file;
  }

  async parseFileContent(fileId: string, userId: string): Promise<string> {
    const file = await this.getFileById(fileId, userId);
    return this.fileParser.parseDocument(file.path, file.mimetype);
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.getFileById(fileId, userId);
    try {
      await fs.unlink(file.path);
    } catch {
      // Ignore if physical file already unlinked
    }
    await this.fileRepo.deleteFile(fileId);
  }
}
