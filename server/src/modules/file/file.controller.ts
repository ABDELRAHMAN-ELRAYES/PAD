import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { diskStorage } from "multer";
import * as path from "path";
import * as crypto from "crypto";
import { FileService } from "./file.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/user.interface";

@ApiTags("Files")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("files")
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload file and parse content" })
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
        fileSize: 20 * 1024 * 1024, // 20MB limit
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: IUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided for upload");
    }

    const saved = await this.fileService.saveUploadedFile(user.id, file);
    let parsedContent: string | null = null;
    try {
      parsedContent = await this.fileService.parseFileContent(saved.id, user.id);
    } catch {
      // Parsing optional for binary media files
    }

    return {
      file: saved,
      content: parsedContent,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get file metadata by ID" })
  async getFile(
    @CurrentUser() user: IUser,
    @Param("id") fileId: string,
  ) {
    return this.fileService.getFileById(fileId, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete file by ID" })
  async deleteFile(
    @CurrentUser() user: IUser,
    @Param("id") fileId: string,
  ) {
    await this.fileService.deleteFile(fileId, user.id);
    return { message: "File deleted successfully" };
  }
}
