import {
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { BlockchainService } from "./blockchain.service";
import { ImageService } from "./image.service";
import { LoggerService } from "./logger.service";
import { MetadataService } from "./metadata.service";
import { GuardianMetadata } from "./models";
import { NetworkService } from "./network.service";
import { StorageService } from "./storage.service";

@Controller()
export class AppController {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly metadataService: MetadataService,
    private readonly networkService: NetworkService,
    private readonly imageService: ImageService,
    private readonly storageService: StorageService,
    private readonly logger: LoggerService
  ) {}

  @Get("/computeMerge/:id")
  async computeMerge(@Param("id") guardianId: number): Promise<void> {
    if (!(await this.networkService.lockGuardianMerge(guardianId))) {
      this.logger.log("Guardian is not available to computing");
      throw new UnauthorizedException();
    }

    // Get data in the blockchain
    const mergeDemand = await this.blockchainService.getMergeDemandData(
      guardianId
    );

    if (!mergeDemand) {
      this.logger.log("No merge demand found");
      throw new UnauthorizedException();
    }

    // Compute the JSON
    const nakedGuardian = await this.networkService.getNakedGuardianMetadata(
      guardianId,
      mergeDemand
    );

    if (!nakedGuardian) {
      this.logger.log("No naked guardian found");
      throw new InternalServerErrorException();
    }

    const guardianMetadata = await this.metadataService.computeGuardianMetadata(
      nakedGuardian,
      mergeDemand
    );

    // Download all assets images
    const isDownloadOk = await this.imageService.downloadAllAssets(
      guardianMetadata
    );

    if (!isDownloadOk) {
      this.logger.log("Assets download failed");
      throw new InternalServerErrorException();
    }

    // Compute the Image
    const folderPath = await this.imageService.computeImage(guardianMetadata);

    // Store image in IPFS
    const mediaIpfsHash = await this.storageService.uploadImageToPinata(
      `${guardianMetadata.name} Media`,
      `${folderPath}/result_compressed.png`
    );

    // Update JSON with the IPFS hash
    this.metadataService.setImageUri(guardianMetadata, mediaIpfsHash);

    // Store JSON in the IPFS
    const metadataIpfsHash = await this.storageService.uploadMetadataToPinata(
      `${guardianMetadata.name} Json`,
      guardianMetadata
    );

    // Store JSON & Image in the GCP bucket
    this.storageService.storeImagesInGcp(guardianMetadata.id);

    // Update the blockchain
    await this.blockchainService.setCid(
      guardianMetadata.id,
      mediaIpfsHash,
      metadataIpfsHash
    );

    // Remove folder
    this.imageService.clear(guardianId);

    // Unlock guardian
    this.networkService.unlockGuardianMerge(guardianMetadata);
  }

  @Get("/forceUnlock/:id")
  async forceUnlock(@Param("id") guardianId: number): Promise<void> {
    // Unlock guardian
    this.networkService.unlockGuardianMerge({
      id: guardianId,
    } as GuardianMetadata);
  }

  @Get("/health")
  async health(): Promise<string> {
    return "OK";
  }
}
