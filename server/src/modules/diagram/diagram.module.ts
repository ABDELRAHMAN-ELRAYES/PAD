import { Module } from "@nestjs/common";
import { DiagramRepository } from "./diagram.repository";
import { DiagramValidatorService } from "./diagram-validator.service";
import { DiagramService } from "./diagram.service";
import { DiagramController } from "./diagram.controller";
import { IdeaModule } from "../idea/idea.module";

@Module({
  imports: [IdeaModule],
  controllers: [DiagramController],
  providers: [DiagramRepository, DiagramValidatorService, DiagramService],
  exports: [DiagramRepository, DiagramValidatorService, DiagramService],
})
export class DiagramModule {}
