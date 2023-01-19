import { Injectable } from "@nestjs/common";
import { GuardianMetadata } from "./models";
import { Project, Image } from "imagizer";
import { NetworkService } from "./network.service";
import { compress } from "compress-images/promise";
import path from "path";
import { fstat } from "fs";
import { rm } from "fs/promises";

@Injectable()
export class ImageService {
  constructor(private readonly networkService: NetworkService) {}

  async computeImage(guardianMetadata: GuardianMetadata): Promise<string> {
    const layersOrder = [
      "Background",
      "Body",
      "Nose",
      "Hairstyle",
      "Eyes",
      "Tatoo",
      "Crown",
      "Armor",
      "Mouth",
      "Weapon",
    ];
    const project = new Project(2048, 2048);
    const layer = project.createLayer({
      blendingMode: "normal", // optional
    });
    const folderPath = this.networkService.getFolderPath(guardianMetadata.id);

    return new Promise((resolve) => {
      const generateLayer = async (index) => {
        let attribute = layersOrder[index];
        if (attribute) {
          const image = new Image();
          image.load(`${folderPath}/${layersOrder[index]}.png`, function() {
            layer.put(image, 0, 0);
            generateLayer(index + 1);
          });
        } else {
          project.save(`${folderPath}/result.png`);
          project.resize(538, 538);
          project.save(`${folderPath}/result_538.png`);
          project.resize(350, 350);
          project.save(`${folderPath}/result_350.png`);
          await this.compressImage(folderPath);
          resolve(folderPath);
        }
      };
      generateLayer(0);
    });
  }

  async downloadAllAssets(
    guardianMetadata: GuardianMetadata
  ): Promise<boolean> {
    const promises = [
      this.networkService.downloadImage("Background", guardianMetadata),
      this.networkService.downloadImage("Body", guardianMetadata),
      this.networkService.downloadImage("Armor", guardianMetadata),
      this.networkService.downloadImage("Eyes", guardianMetadata),
      this.networkService.downloadImage("Mouth", guardianMetadata),
      this.networkService.downloadImage("Hairstyle", guardianMetadata),
      this.networkService.downloadImage("Weapon", guardianMetadata),
      this.networkService.downloadImage("Tatoo", guardianMetadata),
      this.networkService.downloadImage("Crown", guardianMetadata),
      this.networkService.downloadImage("Nose", guardianMetadata),
    ];

    try {
      await Promise.all(promises);
      return true;
    } catch (error) {
      return false;
    }
  }

  async clear(guardianId: number) {
    await rm(this.networkService.getFolderPath(guardianId), {
      recursive: true,
      force: true,
    });
  }

  private async compressImage(folderPath: string): Promise<void> {
    await compress({
      source: `${folderPath}/result*.png`,
      destination: `${folderPath}/result_compressed`,
      enginesSetup: {
        png: { engine: "pngquant", command: false },
      },
    });
  }
}
