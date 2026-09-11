import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { GuidelineRepository } from "./guideline.repository";
import { FileService } from "../file/file.service";
import { IGuideline } from "./types/guideline.interface";

@Injectable()
export class GuidelineService {
  constructor(
    private readonly guidelineRepo: GuidelineRepository,
    private readonly fileService: FileService,
  ) {}

  async createGuideline(
    userId: string,
    title: string,
    content: string,
  ): Promise<IGuideline> {
    if (!title || !content) {
      throw new BadRequestException("Title and content are required");
    }
    return this.guidelineRepo.createGuideline({ userId, title, content });
  }

  async createGuidelineFromFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<IGuideline> {
    const savedFile = await this.fileService.saveUploadedFile(userId, file);
    const parsedContent = await this.fileService.parseFileContent(
      savedFile.id,
      userId,
    );

    return this.guidelineRepo.createGuideline({
      userId,
      fileId: savedFile.id,
      title: file.originalname,
      content: parsedContent,
    });
  }

  async listGuidelines(userId: string): Promise<IGuideline[]> {
    return this.guidelineRepo.listByUserId(userId);
  }

  async deleteGuideline(guidelineId: string, userId: string): Promise<void> {
    const guideline = await this.guidelineRepo.findById(guidelineId);
    if (!guideline) {
      throw new NotFoundException("Guideline not found");
    }
    if (guideline.userId !== userId) {
      throw new ForbiddenException("You do not have permission to delete this guideline");
    }

    if (guideline.fileId) {
      try {
        await this.fileService.deleteFile(guideline.fileId, userId);
      } catch {
        // Continue DB deletion if file cleanup fails
      }
    }

    await this.guidelineRepo.deleteGuideline(guidelineId);
  }
}
