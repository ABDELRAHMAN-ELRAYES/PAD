import { Module } from "@nestjs/common";
import {
  WorkflowRepository,
  HandoffRepository,
} from "./workflow.repository";
import { WorkflowService } from "./workflow.service";
import { HandoffCompilerService } from "./handoff-compiler.service";
import { WorkflowController } from "./workflow.controller";
import { IdeaModule } from "../idea/idea.module";
import { DocumentModule } from "../document/document.module";
import { DiagramModule } from "../diagram/diagram.module";
import { IRModule } from "../ir/ir.module";

@Module({
  imports: [IdeaModule, DocumentModule, DiagramModule, IRModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowRepository,
    HandoffRepository,
    WorkflowService,
    HandoffCompilerService,
  ],
  exports: [
    WorkflowRepository,
    HandoffRepository,
    WorkflowService,
    HandoffCompilerService,
  ],
})
export class WorkflowModule {}
