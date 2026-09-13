import { Module } from "@nestjs/common";
import { IRRepository } from "./ir.repository";
import { IRService } from "./ir.service";
import { IRController } from "./ir.controller";
import { IdeaModule } from "../idea/idea.module";
import { DocumentModule } from "../document/document.module";
import { DiagramModule } from "../diagram/diagram.module";

@Module({
  imports: [IdeaModule, DocumentModule, DiagramModule],
  controllers: [IRController],
  providers: [IRRepository, IRService],
  exports: [IRRepository, IRService],
})
export class IRModule {}
