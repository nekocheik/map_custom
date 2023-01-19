export interface MergeDemand {
  guardianId: number;
  status: MergeDemandStatus;
  weaponId: string;
  armorId: string;
  backgroundId: string;
  crownId: string;
}

export enum MergeDemandStatus {
  Pending = "pending",
  ReadyToClaim = "readyToClaim",
}

export enum Element {
  Water = "Water",
  Rock = "Rock",
  Algae = "Algae",
  Lava = "Lava",
  Bioluminescent = "Bioluminescent",
}

export type TraitType = SplitableTraitType & UnsplitableTraitType;

export type SplitableTraitType = "Background" | "Armor" | "Weapon" | "Crown";

export type UnsplitableTraitType =
  | "Body"
  | "Eyes"
  | "Mouth"
  | "Hairsyle"
  | "Nose";

export interface GuardianMetadata {
  id: number;
  name: string;
  description: "The ROTG collection is the 3D version of the Guardians of the Aquaverse, with its very own features. Take part in the adventure and immerse yourself in the depths of Thalassa.";
  element: Element;
  image: string;
  attributes: GuardianAttributes;
}

export type GuardianAttributes = [
  {
    trait_type: "Background";
    value: string;
  },
  {
    trait_type: "Body";
    value: Element;
    vril: number;
  },
  {
    trait_type: "Armor";
    value: string;
    family: string;
    level: number;
    element: Element;
    vril: number;
  },
  {
    trait_type: "Eyes";
    value: string;
    vril: number;
  },
  {
    trait_type: "Mouth";
    value: string;
    vril: number;
  },
  {
    trait_type: "Hairstyle";
    value: string;
    vril: number;
  },
  {
    trait_type: "Weapon";
    value: string;
    family: string;
    level: number;
    element: Element;
    vril: number;
  },
  {
    trait_type: "Crown";
    value: string;
    family: string;
    level: number;
    element: Element;
    vril: number;
  },
  {
    trait_type: "Nose";
    value: string;
    vril: number;
  },
  {
    trait_type: "Vril";
    value: number;
  }
];

export interface GuardianNakedMetadata {
  id: number;
  name: string;
  description: "The ROTG collection is the 3D version of the Guardians of the Aquaverse, with its very own features. Take part in the adventure and immerse yourself in the depths of Thalassa.";
  element: Element;
  image: string;
  attributes: [
    {
      trait_type: "Body";
      value: Element;
      vril: number;
    },
    {
      trait_type: "Eyes";
      value: string;
      vril: number;
    },
    {
      trait_type: "Mouth";
      value: string;
      vril: number;
    },
    {
      trait_type: "Hairstyle";
      value: string;
      vril: number;
    },
    {
      trait_type: "Nose";
      value: string;
      vril: number;
    },
    {
      trait_type: "Vril";
      value: number;
    }
  ];
}

export interface AssetMetadata {
  trait_type: SplitableTraitType;
  value: string;
  family: string;
  level: number;
  element: Element;
  vril: number;
}

export interface Vril {
  category: SplitableTraitType;
  family: string;
  level: number;
  element: Element;
  vril: number;
}
