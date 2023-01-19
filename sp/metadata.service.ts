import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  AssetMetadata,
  Element,
  GuardianAttributes,
  GuardianMetadata,
  GuardianNakedMetadata,
  MergeDemand,
  SplitableTraitType,
  Vril,
} from "./models";
import { readFile } from "fs/promises";
import axios from "axios";
import Ajv from "ajv";
import { LoggerService } from "./logger.service";

@Injectable()
export class MetadataService {
  private readonly ajv = new Ajv();
  private vrils: Vril[] = [];

  constructor(private readonly logger: LoggerService) {}

  async computeGuardianMetadata(
    nakedGuardian: GuardianNakedMetadata,
    mergeDemand: MergeDemand
  ): Promise<GuardianMetadata> {
    const guardianMetadata: GuardianMetadata = {
      id: nakedGuardian.id,
      name: nakedGuardian.name,
      description: nakedGuardian.description,
      element: nakedGuardian.element,
      image: nakedGuardian.image,
      attributes: await this.computeAttributes(nakedGuardian, mergeDemand),
    };

    const guardianValidator = await this.getJsonSchemaValidator("guardian-v2");

    if (!guardianValidator(guardianMetadata)) {
      this.logger.log("Guardian metadata is not valid");
      throw new InternalServerErrorException();
    }

    return guardianMetadata;
  }

  private async computeAttributes(
    nakedGardian: GuardianNakedMetadata,
    mergeDemand: MergeDemand
  ): Promise<GuardianAttributes> {
    const armor = await this.getAssetByCategory("Armor", mergeDemand.armorId); // Armor
    const weapon = await this.getAssetByCategory(
      "Weapon",
      mergeDemand.weaponId
    ); // Weapon
    const crown = await this.getAssetByCategory("Crown", mergeDemand.crownId); // Crown

    // Increment vril
    nakedGardian.attributes[5].value += armor.vril + weapon.vril + crown.vril;

    return [
      {
        trait_type: "Background",
        value: mergeDemand.backgroundId,
      },
      nakedGardian.attributes[0], // Body // Armor
      {
        trait_type: "Armor",
        value: armor.value,
        family: armor.family,
        level: armor.level,
        element: armor.element,
        vril: armor.vril,
      },
      nakedGardian.attributes[1], // Eyes
      nakedGardian.attributes[2], // Mouth
      nakedGardian.attributes[3], // Hairstyle
      {
        trait_type: "Weapon",
        value: weapon.value,
        family: weapon.family,
        level: weapon.level,
        element: weapon.element,
        vril: weapon.vril,
      },
      {
        trait_type: "Crown",
        value: crown.value,
        family: crown.family,
        level: crown.level,
        element: crown.element,
        vril: crown.vril,
      },
      nakedGardian.attributes[4], // Nose
      nakedGardian.attributes[5], // Vril
    ];
  }

  private async getAssetByCategory(
    category: SplitableTraitType,
    assetId: string
  ): Promise<AssetMetadata> {
    const family = this.getFamily(assetId);
    const level = this.getLevel(assetId);
    const element = this.getElement(assetId);

    const vril = await this.getVril(category, family, level, element);

    return {
      trait_type: category,
      value: assetId,
      family,
      level,
      element,
      vril,
    };
  }

  async getJsonSchemaValidator(schemaId: string): Promise<any> {
    const schema = JSON.parse(
      await readFile(`./schema/${schemaId}.schema.json`, "utf-8")
    );
    return this.ajv.compile(schema, true);
  }

  private getLevel(assetId: string): number {
    const regex = /(?<level>1|2|3|5)/;
    const result = regex.exec(assetId)?.groups?.level;
    const parsedResult = result ? parseInt(result) : undefined;

    if (!parsedResult) {
      throw new ForbiddenException();
    }

    return parsedResult;
  }

  private getElement(assetId: string): Element {
    const regex = /(?<element>Bioluminescent|Algae|Lava|Rock|Water)/;
    const result = regex.exec(assetId)?.groups?.element;

    if (!result) {
      throw new ForbiddenException();
    }

    return Element[result];
  }

  private getFamily(assetId: string): string {
    const level = this.getLevel(assetId);
    const element = this.getElement(assetId);

    return assetId
      .replace(element, "")
      .replace(level.toString(), "")
      .trim();
  }

  private async getVril(
    category: SplitableTraitType,
    family: string,
    level: number,
    element: Element
  ) {
    if (this.vrils.length === 0) {
      await this.loadVrilsData();
    }

    let vril = this.vrils.find(
      (v) =>
        v.category === category &&
        v.family === family &&
        v.level === level &&
        v.element === element
    )?.vril;

    if (!vril) {
      throw new ForbiddenException();
    }

    return vril;
  }

  private async loadVrilsData() {
    // Just load this once when the first call is made
    // Is not optimal but it's life
    const vrilBuffer = await readFile(`./data/vril_data.csv`, "utf-8");
    const csvLines = vrilBuffer.split("\n");

    for (let line of csvLines) {
      const [category, family, _element, _level, _vril] = line.split(",");
      const level = parseInt(_level);
      const element = Element[_element];
      const vril = parseInt(_vril);

      if (!category || !family || !level || !element || !vril) {
        // To be sure this exception is always thrown
        this.vrils = [];
        throw new ServiceUnavailableException();
      }

      this.vrils.push({
        category: category as SplitableTraitType,
        family,
        level,
        element,
        vril,
      });
    }
  }

  setImageUri(guardianMetadata: GuardianMetadata, imageCid: string) {
    guardianMetadata.image = `https://aquaverse.mypinata.cloud/ipfs/${imageCid}`;
  }
}
