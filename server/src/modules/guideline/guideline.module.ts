import { Module } from "@nestjs/common";
import { GuidelineRepository } from "./guideline.repository";
import { GuidelineService } from "./guideline.service";
import { GuidelineController } from "./guideline.controller";
import { FileModule } from "../file/file.module";

@Module({
  imports: [FileModule],
  controllers: [GuidelineController],
  providers: [GuidelineRepository, GuidelineService],
  exports: [GuidelineRepository, GuidelineService],
})
export class GuidelineModule {}
