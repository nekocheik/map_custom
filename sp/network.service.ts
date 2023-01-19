import { ForbiddenException, Injectable } from "@nestjs/common";
import axios from "axios";
import fs from "fs";
import path from "path";
import config from "./configuration/configuration";
import { MetadataService } from "./metadata.service";
import { GuardianMetadata, GuardianNakedMetadata, MergeDemand } from "./models";

@Injectable()
export class NetworkService {
  private readonly NakedGuardianIpfsBaseUrl =
    "https://aquaverse.mypinata.cloud/ipfs/QmeRgyRdZPNwe81gWbnhvjPYGznCMww9SHCoUKApZX6PZy";
  private readonly explorerApiHost: string;

  constructor(private readonly metadataService: MetadataService) {
    this.explorerApiHost =
      process.env.NODE_ENV !== "production"
        ? "https://explorer-api-develop.theaquaverse.io"
        : "https://explorer-api.theaquaverse.io";
  }

  async downloadImage(
    category: string,
    guardianMetadata: GuardianMetadata
  ): Promise<void> {
    const guardianId = guardianMetadata.id;
    const assetId =
      category === "Body"
        ? "Guardian"
        : guardianMetadata.attributes.find(
            (attribute) =>
              attribute.trait_type ===
              (category === "Tatoo" ? "Crown" : category)
          ).value;

    const assetsBaseUrl =
      "https://storage.googleapis.com/guardians-assets-original/assets-v2";
    const url = `${assetsBaseUrl}/${category}/${assetId}.png`.replaceAll(
      " ",
      "%20"
    );

    const folderPath = this.getFolderPath(guardianId);
    await fs.promises.mkdir(folderPath, { recursive: true });

    const imagePath = `${folderPath}/${category}.png`;
    const writer = fs.createWriteStream(imagePath);

    const response = await axios.get(url, {
      responseType: "stream",
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }

  async getNakedGuardianMetadata(
    id: number,
    mergeDemand: MergeDemand
  ): Promise<GuardianNakedMetadata> {
    const url = `${this.NakedGuardianIpfsBaseUrl}/${id}.json`;

    const nakedGuardian = (
      await axios.get<GuardianNakedMetadata>(url, {
        headers: {
          "Content-Type": "application/json",
        },
      })
    ).data;

    const guardianNakedValidator = await this.metadataService.getJsonSchemaValidator(
      "guardian-v2-naked"
    );

    if (!guardianNakedValidator(nakedGuardian)) {
      throw new ForbiddenException();
    }

    return nakedGuardian;
  }

  async lockGuardianMerge(guardianId: number): Promise<boolean> {
    return true;
    const url = `${this.explorerApiHost}/collection/lockMerge/${guardianId}`;
    let res;
    try {
      res = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: config()["explorer-api-key"],
        },
      });
    } catch (e) {
      console.log(e);
      return false;
    }

    console.log(res);

    return res?.data?.justGotLocked as boolean;
  }

  async unlockGuardianMerge(
    guardianMetadata: GuardianMetadata
  ): Promise<boolean> {
    return true;
    const url = `${this.explorerApiHost}/collection/unlockMerge/${guardianMetadata.id}`;
    let res;
    try {
      res = await axios.post(url, guardianMetadata, {
        headers: {
          "Content-Type": "application/json",
          Authorization: config()["explorer-api-key"],
        },
      });
    } catch {
      return false;
    }

    return res.data.justGotMerged;
  }

  getFolderPath(guardianId: number) {
    return path.resolve(__dirname, "..", "results", guardianId.toString());
  }
}
