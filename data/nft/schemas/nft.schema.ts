import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NFTDocument = NFT & Document;

const BaseAssetType = { name: String, url: String, rarity: Number, _id: false };
const LevelAssetType = { ...BaseAssetType, level: Number };
const ColorAssetType = { ...BaseAssetType, description: String, color: String };

type BaseAssetType = { name: string; url: string; rarity: string };
type ColorAssetType = BaseAssetType & { description: string; color: string };
type LevelAssetType = BaseAssetType & { level: number };

@Schema({ versionKey: false })
export class NFT {
  @Prop({ required: true, type: Number })
  id: number;
  @Prop({ required: true, type: String })
  idName: string;
  @Prop({ required: true, type: String })
  identifier: string;
  @Prop({ required: true, type: Number })
  rarity: number;
  @Prop({ required: true, type: Number })
  rank: number;
  @Prop({ required: true, type: String })
  stone: string;
  @Prop({ required: true, type: BaseAssetType })
  background: BaseAssetType;
  @Prop({ required: true, type: BaseAssetType })
  body: BaseAssetType;
  @Prop({ required: true, type: BaseAssetType })
  nose: BaseAssetType;
  @Prop({ required: true, type: ColorAssetType })
  eyes: ColorAssetType;
  @Prop({ required: true, type: ColorAssetType })
  mouth: ColorAssetType;
  @Prop({ required: true, type: ColorAssetType })
  hairstyle: ColorAssetType;
  @Prop({ required: true, type: LevelAssetType })
  crown: LevelAssetType;
  @Prop({ required: true, type: LevelAssetType })
  armor: LevelAssetType;
  @Prop({ required: true, type: LevelAssetType })
  weapon: LevelAssetType;
  @Prop({ type: Object })
  market: {
    source: string;
    identifier: string;
    type: 'bid' | 'buy';
    bid: null | {
      min: number;
      current: number;
      deadline: [number, number, number, number];
    };
    token: string;
    price: number;
    currentUsd: number;
    timestamp: number;
  };
  @Prop({ type: Number })
  timestamp: number;
  @Prop({ type: Number, default: 0 })
  viewed: number;
  @Prop({ type: Boolean, default: false })
  isClaimed: boolean;
}

export const NFTSchema = SchemaFactory.createForClass(NFT);
