import { Module } from "@nestjs/common";
import { IterationRepository } from "./iteration.repository";
import { IterationService } from "./iteration.service";
import { IterationController } from "./iteration.controller";
import { IdeaModule } from "../idea/idea.module";
import { DiagramModule } from "../diagram/diagram.module";
import { IRModule } from "../ir/ir.module";
import { DocumentModule } from "../document/document.module";
import { WorkflowModule } from "../workflow/workflow.module";

@Module({
  imports: [
    IdeaModule,
    DiagramModule,
    IRModule,
    DocumentModule,
    WorkflowModule,
  ],
  controllers: [IterationController],
  providers: [IterationRepository, IterationService],
  exports: [IterationRepository, IterationService],
})
export class IterationModule {}
