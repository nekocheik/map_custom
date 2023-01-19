import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { BlockchainService } from "./blockchain.service";
import { ImageService } from "./image.service";
import { MetadataService } from "./metadata.service";
import { NetworkService } from "./network.service";
import { ConfigModule } from "@nestjs/config";
import { StorageService } from "./storage.service";
import { LoggerService } from "./logger.service";
import { EnvConfigModule } from "./configuration/configuration.module";

@Module({
  imports: [EnvConfigModule],
  controllers: [AppController],
  providers: [
    BlockchainService,
    MetadataService,
    NetworkService,
    ImageService,
    StorageService,
    LoggerService,
  ],
})
export class AppModule {}
