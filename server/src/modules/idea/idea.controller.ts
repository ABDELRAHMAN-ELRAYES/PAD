import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { diskStorage } from "multer";
import * as path from "path";
import * as crypto from "crypto";
import { IdeaService } from "./idea.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/user.interface";
import { CreateIdeaDto } from "./dto/create-idea.dto";
import { RefineIdeaDto } from "./dto/refine-idea.dto";
import { ConfirmIdeaDto } from "./dto/confirm-idea.dto";

@ApiTags("Ideas")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ideas")
export class IdeaController {
  constructor(private readonly ideaService: IdeaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new idea concept" })
  async createIdea(
    @CurrentUser() user: IUser,
    @Body() dto: CreateIdeaDto,
  ) {
    const idea = await this.ideaService.createIdea(user.id, dto);
    return { idea };
  }

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new idea by uploading a document (PDF, TXT, MD)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          const uniqueName = `${crypto.randomUUID()}${ext}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  async uploadIdeaDocument(
    @CurrentUser() user: IUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    const idea = await this.ideaService.createIdeaFromFile(user.id, file);
    return { idea };
  }

  @Get()
  @ApiOperation({ summary: "List all ideas for current user" })
  async listIdeas(@CurrentUser() user: IUser) {
    const ideas = await this.ideaService.listUserIdeas(user.id);
    return { ideas, count: ideas.length };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get idea by ID" })
  async getIdeaById(
    @CurrentUser() user: IUser,
    @Param("id") ideaId: string,
  ) {
    const idea = await this.ideaService.getIdeaById(ideaId, user.id);
    return { idea };
  }

  @Post(":id/refine")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refine idea concept" })
  async refineIdea(
    @CurrentUser() user: IUser,
    @Param("id") ideaId: string,
    @Body() dto: RefineIdeaDto,
  ) {
    const idea = await this.ideaService.refineIdea(ideaId, user.id, dto);
    return { idea };
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm idea scope baseline" })
  async confirmIdea(
    @CurrentUser() user: IUser,
    @Param("id") ideaId: string,
    @Body() dto: ConfirmIdeaDto,
  ) {
    const idea = await this.ideaService.confirmIdea(ideaId, user.id, dto);
    return { idea };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete idea by ID" })
  async deleteIdea(
    @CurrentUser() user: IUser,
    @Param("id") ideaId: string,
  ) {
    await this.ideaService.deleteIdea(ideaId, user.id);
    return { message: "Idea deleted successfully" };
  }
}
