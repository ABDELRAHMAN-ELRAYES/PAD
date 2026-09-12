import { Module } from "@nestjs/common";
import { DiscoveryRepository } from "./discovery.repository";
import { DiscoveryService } from "./discovery.service";
import { DiscoveryController } from "./discovery.controller";
import { IdeaModule } from "../idea/idea.module";

@Module({
  imports: [IdeaModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryRepository, DiscoveryService],
  exports: [DiscoveryRepository, DiscoveryService],
})
export class DiscoveryModule {}
