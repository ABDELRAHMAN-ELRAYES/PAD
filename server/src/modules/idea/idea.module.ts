import { Module } from "@nestjs/common";
import { IdeaRepository } from "./idea.repository";
import { IdeaService } from "./idea.service";
import { IdeaController } from "./idea.controller";
import { FileModule } from "../file/file.module";

@Module({
  imports: [FileModule],
  controllers: [IdeaController],
  providers: [IdeaRepository, IdeaService],
  exports: [IdeaRepository, IdeaService],
})
export class IdeaModule {}
