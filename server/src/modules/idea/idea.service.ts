import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { IdeaRepository } from "./idea.repository";
import { FileService } from "../file/file.service";
import { CreateIdeaDto } from "./dto/create-idea.dto";
import { RefineIdeaDto } from "./dto/refine-idea.dto";
import { ConfirmIdeaDto } from "./dto/confirm-idea.dto";
import { IIdea } from "./types/idea.interface";

@Injectable()
export class IdeaService {
  constructor(
    private readonly ideaRepo: IdeaRepository,
    private readonly fileService: FileService,
  ) {}

  async createIdea(userId: string, dto: CreateIdeaDto): Promise<IIdea> {
    if (!dto.rawText || dto.rawText.trim().length === 0) {
      throw new BadRequestException("Idea raw text is required");
    }
    return this.ideaRepo.createIdeaWithIntake(userId, dto.rawText.trim());
  }

  async createIdeaFromFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<IIdea> {
    const savedFile = await this.fileService.saveUploadedFile(userId, file);
    const parsedText = await this.fileService.parseFileContent(
      savedFile.id,
      userId,
    );

    if (!parsedText || parsedText.trim().length === 0) {
      throw new BadRequestException("Uploaded document contains no readable text");
    }

    return this.ideaRepo.createIdeaWithIntake(
      userId,
      parsedText.trim(),
      file.originalname,
    );
  }

  async getIdeaById(ideaId: string, userId: string): Promise<IIdea> {
    const idea = await this.ideaRepo.findById(ideaId);
    if (!idea) {
      throw new NotFoundException("Idea not found");
    }
    if (idea.userId !== userId) {
      throw new ForbiddenException("Unauthorized access to this idea");
    }
    return idea;
  }

  async listUserIdeas(userId: string): Promise<IIdea[]> {
    return this.ideaRepo.findByUserId(userId);
  }

  async refineIdea(
    ideaId: string,
    userId: string,
    dto: RefineIdeaDto,
  ): Promise<IIdea> {
    await this.getIdeaById(ideaId, userId);

    await this.ideaRepo.updateIntake(ideaId, {
      refinedText: dto.refinedText,
      businessDescription: dto.businessDescription,
    });

    return (await this.ideaRepo.findById(ideaId))!;
  }

  async confirmIdea(
    ideaId: string,
    userId: string,
    _dto?: ConfirmIdeaDto,
  ): Promise<IIdea> {
    const idea = await this.getIdeaById(ideaId, userId);

    if (idea.status === "confirmed") {
      return idea;
    }

    const updated = await this.ideaRepo.updateStatus(
      ideaId,
      "confirmed",
      new Date(),
    );
    return updated!;
  }

  async deleteIdea(ideaId: string, userId: string): Promise<void> {
    await this.getIdeaById(ideaId, userId);
    await this.ideaRepo.deleteIdea(ideaId);
  }
}
