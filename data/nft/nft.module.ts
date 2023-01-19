import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { NFT, NFTSchema } from './schemas/nft.schema';
import { CollectionModule } from '../collection/collection.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NFT.name, schema: NFTSchema }]),
    CollectionModule,
  ],
  controllers: [NftController],
  providers: [NftService],
})
export class NftModule {}
