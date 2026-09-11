import { Module } from "@nestjs/common";
import { FileRepository } from "./file.repository";
import { FileParserService } from "./file-parser.service";
import { FileService } from "./file.service";
import { FileController } from "./file.controller";

@Module({
  controllers: [FileController],
  providers: [FileRepository, FileParserService, FileService],
  exports: [FileRepository, FileService, FileParserService],
})
export class FileModule {}
