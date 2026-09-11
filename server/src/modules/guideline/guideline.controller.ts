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
import { GuidelineService } from "./guideline.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IUser } from "../user/types/user.interface";

@ApiTags("Guidelines")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("guidelines")
export class GuidelineController {
  constructor(private readonly guidelineService: GuidelineService) {}

  @Get()
  @ApiOperation({ summary: "List all guidelines for current user" })
  async listGuidelines(@CurrentUser() user: IUser) {
    return this.guidelineService.listGuidelines(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create guideline from raw text" })
  async createGuideline(
    @CurrentUser() user: IUser,
    @Body() body: { title: string; content: string },
  ) {
    return this.guidelineService.createGuideline(
      user.id,
      body.title,
      body.content,
    );
  }

  @Post("file")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create guideline from uploaded document" })
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
  async createGuidelineFromFile(
    @CurrentUser() user: IUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    return this.guidelineService.createGuidelineFromFile(user.id, file);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete guideline by ID" })
  async deleteGuideline(
    @CurrentUser() user: IUser,
    @Param("id") guidelineId: string,
  ) {
    await this.guidelineService.deleteGuideline(guidelineId, user.id);
    return { message: "Guideline deleted successfully" };
  }
}
