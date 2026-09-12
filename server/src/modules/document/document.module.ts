import { Module } from "@nestjs/common";
import { DocumentRepository } from "./document.repository";
import { DocumentService } from "./document.service";
import { DocumentController } from "./document.controller";
import { IdeaModule } from "../idea/idea.module";

@Module({
  imports: [IdeaModule],
  controllers: [DocumentController],
  providers: [DocumentRepository, DocumentService],
  exports: [DocumentRepository, DocumentService],
})
export class DocumentModule {}
