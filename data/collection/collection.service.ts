import { Injectable, OnModuleInit } from '@nestjs/common';
import { Model, SortValues } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ApiNetworkProvider } from '@elrondnetwork/erdjs-network-providers';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { EnvironmentVariables } from '../../config/configuration.d';
import { NotFoundException } from '../../exceptions/http.exception';
import {
  GetAllDto,
  GetAllDtoLimited,
  GetCollectionDto,
  GetElementDto,
  GetErdDto,
  GetIdDto,
  GetIdentifiersDto,
  GetIdsDto,
  GetIdWithoutCollectionDto,
  GetMarketDto,
  ROTGModel,
} from './dto/collection.dto';
import { Cron } from '@nestjs/schedule';
import { pickBy, identity, isEmpty } from 'lodash';
import { Collection, CollectionDocument } from './schemas/collection.schema';
import { scrapMarkets } from './collection.market';
import {
  erdDoGetGeneric,
  erdDoPostGeneric,
  processElrondNFTs,
} from './collection.helpers';

let EGLD_RATE = 0;
let RUNNING = false;
let SCRAP_ROTG = false;

function getTimeUntil(finalTimestamp): [number, number, number, number] {
  const currentTimestamp = Math.floor(new Date().getTime() / 1000);
  let deadline = finalTimestamp - currentTimestamp;
  if (deadline < 0) return [0, 0, 0, 0];
  const days = Math.floor(deadline / 86400);
  deadline = deadline - days * 86400;
  const hours = Math.floor(deadline / 3600);
  deadline = deadline - hours * 3600;
  const minutes = Math.floor(deadline / 60);
  const seconds = deadline - minutes * 60;
  return [days, hours, minutes, seconds];
}

@Injectable()
export class CollectionService implements OnModuleInit {
  private networkProvider: ApiNetworkProvider;
  public constructor(
    @InjectSentry() private readonly client: SentryService,
    private configService: ConfigService<EnvironmentVariables>,
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
  ) {
    this.networkProvider = this.configService.get('elrond-network-provider');
  }
  async onModuleInit(): Promise<void> {
    // await this.scrapMarket();
  }
  private async getUserNfts(collection, erd, filters) {
    const size = 1450;
    const dataNFTs = await erdDoGetGeneric(
      this.networkProvider,
      `accounts/${erd}/nfts?from=0&size=${size}&collections=${collection}&withScamInfo=false&computeScamInfo=false`,
    );
    const userNFTIds = dataNFTs.map((x) => x.nonce);
    if (userNFTIds.length === 0) throw new NotFoundException();
    const sfts = dataNFTs
      .filter((d) => d.type === 'SemiFungibleESDT')
      .reduce((agg, unit) => {
        return { ...agg, [unit.nonce]: Number(unit.balance) };
      }, {});
    const filtersQuery = this.getFiltersQuery(filters);
    const findQuery = { id: { $in: userNFTIds } };
    return { findQuery, filtersQuery, sfts };
  }

  async getByIds(getIdsDto: GetIdsDto) {
    try {
      const { collection, ids } = getIdsDto;
      const nfts = await this.collectionModel.find(
        { collectionName: collection, id: { $in: ids } },
        '-_id',
      );
      return { nfts };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async getElementFloorPrice(getElementDto: GetElementDto) {
    try {
      const { collection, element } = getElementDto;
      const lowestPriceNft = await this.collectionModel
        .find(
          {
            collectionName: collection,
            market: { $exists: true },
            stone: element,
          },
          '-_id',
        )
        .sort('market.price')
        .limit(1);
      if (lowestPriceNft && lowestPriceNft.length > 0) {
        return {
          floorPrice: lowestPriceNft[0].market.price,
          details: lowestPriceNft[0],
        };
      } else {
        return {
          floorPrice: 0,
          details: {},
        };
      }
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async getByIdentifiers(getIdentifiersDto: GetIdentifiersDto) {
    try {
      const { collection, identifiers } = getIdentifiersDto;
      const nfts = await this.collectionModel.find(
        { collectionName: collection, identifier: { $in: identifiers } },
        '-_id',
      );
      return { nfts };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async findByUser(getErdDto: GetErdDto | GetAllDto) {
    try {
      const { erd, collection } = getErdDto as GetErdDto;
      const { by, order, page } = getErdDto as GetAllDto;
      const { findQuery, filtersQuery, sfts } = await this.getUserNfts(
        collection,
        erd,
        getErdDto,
      );
      const count = 20;
      const offset = count * (page - 1);
      const sortQuery = { [by]: order === 'asc' ? 1 : -1 } as {
        [by: string]: SortValues;
      };
      const nfts = await this.collectionModel
        .find({ ...findQuery, ...filtersQuery }, '-_id')
        .sort(sortQuery)
        .skip(offset)
        .limit(count);
      nfts.forEach((nft) => {
        nft.balance = nft.idName in sfts ? sfts[nft.idName] : 1;
      });
      const totalCount = await this.collectionModel.count({
        ...findQuery,
        ...filtersQuery,
      });
      return { nfts, totalCount, pageCount: Math.ceil(totalCount / count) };
    } catch (error) {
      if (error instanceof NotFoundException) return { nfts: [] };
      this.client.instance().captureException(error);
      throw error;
    }
  }

  // to remove
  async updateDatabase(assets) {
    try {
      const collections = [];
      let i = 0;
      for (const sft of assets) {
        const pngUrl = sft.media[0].originalUrl.split('/');
        let path = pngUrl[5] + '/' + pngUrl[6].split('.')[0];
        switch (path) {
          case 'Background/Medusa':
            path = 'Background/' + encodeURIComponent('Médusa');
            break;
          case 'Armor/Erales Legendary Algae 5':
            path = 'Armor/' + encodeURIComponent('Eralès Legendary Algae 5');
            break;
        }
        const assetData = await axios.get(
          'https://storage.googleapis.com/guardians-assets-original/json-asset-v2/' +
            path +
            '.json',
        );
        console.log('json read: ' + i);
        i++;
        const asset = {
          url: '/' + path + '.png',
        };
        let assetType;
        let stone;
        for (const trait of assetData.data.attributes) {
          switch (trait.trait_type) {
            case 'Type':
              assetType = trait.value.toLowerCase();
              break;
            case 'Family':
              asset['name'] = trait.value.toLowerCase();
              break;
            case 'Element':
              stone = trait.value.toLowerCase();
              break;
            case 'Vril':
              asset['vril'] = trait.value;
              break;
            case 'Level':
              asset['level'] = trait.value;
              break;
          }
        }
        const output = {
          stone,
          assetType,
          [assetType]: {
            ...asset,
          },
          collectionName: sft.collection,
          identifier: sft.identifier,
          id: sft.nonce,
          idName: sft.nonce.toString(),
          vril: asset['vril'],
        };
        collections.push(output);
      }
      const updateObject = collections.map((d) => ({
        updateOne: {
          filter: { id: d.id, collectionName: d.collectionName },
          update: d,
          upsert: true,
        },
      }));
      // console.log('starting bulk write');
      // await this.collectionModel.bulkWrite(updateObject);
      // console.log('finish');
    } catch (error) {
      console.error(error);
    }
  }

  async scrap() {
    const rotg = this.configService.get('rotg-collection-name');
    const lastNft = (
      await erdDoGetGeneric(
        this.networkProvider,
        `nfts?collection=${rotg}&from=0&size=1&includeFlagged=true`,
      )
    )[0];

    const count = await this.collectionModel.count({
      collectionName: rotg,
    });

    const nftToAdd = lastNft.nonce - count;

    const nfts = await erdDoGetGeneric(
      this.networkProvider,
      `nfts?collection=${rotg}&from=0&size=${nftToAdd}&includeFlagged=true`,
    );
    nfts.forEach((nft) => {
      this.collectionModel.create({
        collection: `${rotg}-2`,
        identifier: nft.identifier,

      });
    });
    console.log(JSON.stringify(nfts[0]));
  }

  // to remove
  async scrapAssets() {
    try {
      this.scrap();
      // await processElrondNFTs(
      //   this.networkProvider,
      //   'accounts',
      //   'erd1qqqqqqqqqqqqqpgq58vp0ydxgpae47pkxqfscvnnzv6vaq9derqqqwmujy',
      //   async (nftList: any[]) => {
      //   },
      // );
      // const nfts = await this.collectionModel.find(
      //   {
      //     collectionName: 'ROTG-467abf',
      //   },
      //   '-_id',
      // );

      // nfts = nfts.map((nft) => {
      //   return {
      //     ...nft.$clone(),
      //     collectionName: nft.collectionName.replace(
      //       'ASSET-6b7288',
      //       'ROTGW-0da75b',
      //     ),
      //     oldId: nft.identifier,
      //     identifier: nft.identifier.replace('ASSET-6b7288', 'ROTGW-0da75b'),
      //   };
      // }) as any;

      // this.collectionModel.create({

      // })

      // (nfts as any).forEach(async (nft, i) => {
      //   const result = await this.collectionModel.findOneAndUpdate(
      //     {
      //       identifier: nft.oldId,
      //     },
      //     {
      //       identifier: nft.identifier,
      //       collectionName: nft.collectionName,
      //     },
      //   );
      //   console.log(result);
      //   console.log({
      //     identifier: nft.identifier,
      //     collectionName: nft.collectionName,
      //   });
      //   // await result.save();
      //   if (i == 0) {
      //     console.log(result);
      //   }
      // });

      // await this.collectionModel.updateMany(
      //   {
      //     isTrulyClaimed: { $exists: false },
      //     isClaimed: false,
      //     collectionName: this.configService.get('rotg-collection-name'),
      //   },
      //   {
      //     isClaimed: true,
      //   },
      // );
      // await this.collectionModel.updateMany(
      //   {
      //     isTrulyClaimed: { $exists: true },
      //   },
      //   {
      //     $unset: {
      //       isTrulyClaimed: true,
      //     },
      //   },
      // );
    } catch (e) {
      console.error(e);
    }
  }

  private async updateEgldRate() {
    try {
      const coingecko = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=elrond-erd-2&vs_currencies=usd',
      );
      if (
        coingecko?.data &&
        coingecko.data['elrond-erd-2'] &&
        coingecko.data['elrond-erd-2']['usd']
      ) {
        EGLD_RATE = coingecko.data['elrond-erd-2']['usd'];
      }
    } catch (e) {}
  }

  @Cron('* * * * *')
  private async scrapMarket() {
    try {
      if (RUNNING) return;
      RUNNING = true;
      SCRAP_ROTG = !SCRAP_ROTG;
      await this.updateEgldRate();
      const timestamp: number = new Date().getTime();
      // await this.fullScrapTrustmarket('bid', timestamp);
      // await this.fullScrapTrustmarket('buy', timestamp);
      // await this.scrapDeadrare(timestamp);
      const collectionName = SCRAP_ROTG
        ? this.configService.get('rotg-collection-name')
        : this.configService.get('nft-collection-name');
      await scrapMarkets(
        this.collectionModel,
        collectionName,
        EGLD_RATE,
        timestamp,
      );
      await this.collectionModel.updateMany(
        {
          collectionName,
          timestamp: { $exists: true, $ne: timestamp },
        },
        { $unset: { market: 1, timestamp: 1 } },
      );
      RUNNING = false;
    } catch (error) {
      RUNNING = false;
      console.log(error);
      this.client.instance().captureException(error);
    }
  }

  async findByUserLimited(getErdDto: GetErdDto | GetAllDtoLimited) {
    try {
      const { collection, erd } = getErdDto as GetErdDto;
      const { limit } = getErdDto as GetAllDtoLimited;
      const { findQuery, filtersQuery } = await this.getUserNfts(
        collection,
        erd,
        getErdDto,
      );
      const nfts = await this.collectionModel
        .find({ ...findQuery, ...filtersQuery }, '-_id -market')
        .limit(limit);
      const totalCount = await this.collectionModel.count({
        ...findQuery,
        ...filtersQuery,
      });
      return { nfts, totalCount };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async findUserNftCount(getErdDto: GetErdDto) {
    try {
      const { collection, erd } = getErdDto as GetErdDto;
      const { findQuery, filtersQuery } = await this.getUserNfts(
        collection,
        erd,
        getErdDto,
      );
      const totalCount = await this.collectionModel.count({
        ...findQuery,
        ...filtersQuery,
      });
      return { totalCount };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async updateNFTOwners(collection) {
    try {
      const endpoints = Array.from(
        { length: 20 },
        (_, index) =>
          'https://devnet-api.elrond.com/collections/' +
          collection +
          '/nfts?from=' +
          index * 500 +
          '&size=500',
      );
      return axios.all(endpoints.map((endpoint) => axios.get(endpoint)));
    } catch (e) {
      console.error(e);
    }
  }

  async findCollectionNftById(getIdDto: GetIdDto) {
    try {
      const { collection, id } = getIdDto;
      const record = await this.collectionModel.findOneAndUpdate(
        { collectionName: collection, id },
        { $inc: { viewed: 1 } },
        { new: true, projection: '-_id' },
      );
      if (!record) throw new NotFoundException();
      return record;
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async findByIdPrefix(getFindByIdPrefix: GetIdDto) {
    try {
      // to remove
      // this.scrapAssets('ASSET-6b7288');
      // return;
      const { collection, id } = getFindByIdPrefix as GetIdDto;
      const nfts = await this.collectionModel
        .find({
          collectionName: collection,
          idName: new RegExp('^' + id),
        })
        .sort({ id: 1 })
        .limit(40);
      return { nfts };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async lockMergeV2(getIdDto: GetIdWithoutCollectionDto) {
    try {
      const { id } = getIdDto;
      const record = await this.collectionModel.findOneAndUpdate(
        {
          collectionName: this.configService.get('rotg-collection-name'),
          id,
          lockedOn: { $exists: false },
        },
        { lockedOn: new Date() },
        { new: true, projection: '-_id' },
      );
      return {
        justGotLocked: record ? true : false,
      };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async unlockMergeV2(rotgModel: ROTGModel) {
    try {
      const { id } = rotgModel;
      const record = await this.collectionModel.findOne({
        collectionName: this.configService.get('rotg-collection-name'),
        id,
        lockedOn: { $exists: true },
      });
      if (record) {
        record.lockedOn = undefined;
        await record.save();
      }
      return {
        justGotMerged: record ? true : false,
      };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async forceUnlockTest(rotgModel: ROTGModel) {
    try {
      const { id } = rotgModel;
      await this.collectionModel.findOneAndUpdate(
        {
          collectionName: this.configService.get('rotg-collection-name'),
          id,
          lockedOn: { $exists: true },
        },
        { $unset: { lockedOn: true } },
      );
      return true;
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  private getFiltersQuery(dto) {
    const dirtyObject = {
      'background.name': dto.background,
      'crown.name': dto.crown,
      'hairstyle.name': dto.hairstyle,
      'hairstyle.color': dto.hairstyleColor,
      'eyes.name': dto.eyes,
      'eyes.color': dto.eyesColor,
      'weapon.level': dto.weaponLevel,
      'armor.level': dto.armorLevel,
      'crown.level': dto.crownLevel,
      'nose.name': dto.nose,
      'mouth.name': dto.mouth,
      'mouth.color': dto.mouthColor,
      'armor.name': dto.armor,
      'weapon.name': dto.weapon,
      collectionName: dto.collection,
      stone: dto.stone,
      isClaimed: dto.isClaimed,
    };
    if (dto.id)
      dirtyObject['$expr'] = {
        $regexMatch: {
          input: { $toString: '$id' },
          regex: `^${dto.id}`,
        },
      };
    const filtersQuery = pickBy(dirtyObject, identity);
    if (dto.isClaimed === true || dto.isClaimed === false) {
      filtersQuery.isClaimed = dto.isClaimed;
    }
    return filtersQuery;
  }

  async findAll(getAllDto: GetAllDto) {
    try {
      const { by, order, page } = getAllDto as GetAllDto;
      const findQuery = this.getFiltersQuery(getAllDto);
      const count = 20;
      const offset = count * (page - 1);
      const sortQuery = { [by]: order === 'asc' ? 1 : -1 } as {
        [by: string]: SortValues;
      };
      let nfts = await this.collectionModel
        .find(findQuery, '-_id')
        .sort(sortQuery)
        .skip(offset)
        .limit(count);
      const totalCount = isEmpty(findQuery)
        ? 9999
        : await this.collectionModel.count(findQuery);
      if (findQuery.isClaimed === false) {
        const updatedNfts = await this.checkSmartContract(nfts);
        nfts = updatedNfts.filter((n) => n.isClaimed === false);
      }
      return { nfts, totalCount, pageCount: Math.ceil(totalCount / count) };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async updateIsClaimed(collection, claimedIds) {
    await this.collectionModel.updateMany(
      { collectionName: collection, id: { $in: claimedIds } },
      { isClaimed: true },
    );
  }

  async findByMarket(getMarketDto: GetMarketDto) {
    try {
      const { order, page } = getMarketDto;
      let { by } = getMarketDto;
      const count = getMarketDto.count ? getMarketDto.count : 20;
      const offset = count * (page - 1);
      const filtersQuery = this.getFiltersQuery(getMarketDto);
      const marketQuery = {
        market: { $exists: true },
        'market.price': { $exists: true },
        'market.token': { $ne: 'WATER-9ed400' },
      };
      if (getMarketDto.type) marketQuery['market.type'] = getMarketDto.type;
      const findQuery = { ...marketQuery, ...filtersQuery };
      if (by === 'price') by = 'market.currentUsd';
      else if (by === 'latest') by = 'market.timestamp';
      const sortQuery = { [by]: order === 'asc' ? 1 : -1 } as {
        [by: string]: SortValues;
      };

      const nfts = await this.collectionModel
        .find(findQuery, '-_id -timestamp')
        .sort(sortQuery)
        .skip(offset)
        .limit(count);
      const totalCount = await this.collectionModel.count(findQuery);
      return { nfts, totalCount, pageCount: Math.ceil(totalCount / count) };
    } catch (error) {
      console.log(error.response);
      this.client.instance().captureException(error);
      throw error;
    }
  }

  // @Cron('*/2 * * * *')
  // private async scrapMarket() {
  //   try {
  //     const timestamp: number = new Date().getTime();
  //     await this.fullScrapTrustmarket('bid', timestamp);
  //     await this.fullScrapTrustmarket('buy', timestamp);
  //     // await this.scrapDeadrare(timestamp);
  //     await this.nftModel.updateMany(
  //       { timestamp: { $exists: true, $ne: timestamp } },
  //       { $unset: { market: 1, timestamp: 1 } },
  //     );
  //   } catch (error) {
  //     this.client.instance().captureException(error);
  //   }
  // }
  // private async scrapTrustmarket(
  //   type: 'bid' | 'buy',
  //   offset: number,
  //   count: number,
  //   timestamp: number,
  // ) {
  //   try {
  //     const trustmarketApi = this.configService.get('trustmarket-api');
  //     const { data } = await axios.post(trustmarketApi, {
  //       filters: {
  //         onSale: true,
  //         auctionTypes: type === 'bid' ? ['NftBid'] : ['Nft'],
  //       },
  //       collection: 'GUARDIAN-3d6635',
  //       skip: offset,
  //       top: count,
  //       select: ['onSale', 'saleInfoNft', 'identifier', 'nonce'],
  //     });
  //     if (!data.results || data.results.length === 0) return true;
  //     if (type === 'buy') {
  //       const nftSample = data.results[0];
  //       EGLD_RATE =
  //         nftSample.saleInfoNft?.usd / nftSample.saleInfoNft?.max_bid_short;
  //     }
  //     const isLast: boolean = offset + data.resultsCount === data.count;
  //     const updateObject = data.results.map((d) => ({
  //       updateOne: {
  //         filter: { id: d.nonce },
  //         update: {
  //           market: {
  //             source:
  //               d.saleInfoNft?.marketplace === 'DR'
  //                 ? 'deadrare'
  //                 : 'trustmarket',
  //             identifier: d.identifier,
  //             type: d.saleInfoNft?.auction_type === 'NftBid' ? 'bid' : 'buy',
  //             bid:
  //               d.saleInfoNft?.auction_type !== 'NftBid'
  //                 ? null
  //                 : {
  //                     min: d.saleInfoNft?.min_bid_short,
  //                     current: d.saleInfoNft?.current_bid_short,
  //                     deadline: getTimeUntil(d.saleInfoNft?.deadline),
  //                   },
  //             token: d.saleInfoNft?.accepted_payment_token,
  //             price: d.saleInfoNft?.max_bid_short,
  //             currentUsd: +d.saleInfoNft?.usd,
  //             timestamp: +d.saleInfoNft?.timestamp,
  //           },
  //           timestamp,
  //         },
  //       },
  //     }));
  //     await this.nftModel.bulkWrite(updateObject);
  //     return isLast;
  //   } catch (error) {
  //     this.client.instance().captureException(error);
  //     throw error;
  //   }
  // }

  async checkSmartContract(nfts) {
    // get nonces
    const unclaimedNFTsNonce = nfts
      .filter((n) => n.isClaimed === false)
      .map((n) => n.identifier.split('-')[2]);
    if (unclaimedNFTsNonce.length === 0) return nfts;
    // get isClaimed from SC
    const getHaveBeenClaimed = await erdDoPostGeneric(
      this.networkProvider,
      'query',
      {
        scAddress: this.configService.get('claim-sc'),
        funcName: 'haveBeenClaimed',
        args: unclaimedNFTsNonce,
      },
    );
    // update nfts with new isClaimed
    const claimedIds = [];
    for (const nft of nfts) {
      const index = unclaimedNFTsNonce.findIndex(
        (nonce) => nonce === nft.identifier.split('-')[2],
      );
      if (index !== -1) {
        const isCurrentlyClaimed =
          getHaveBeenClaimed.returnData[index] === 'AQ==';
        nft.isClaimed = isCurrentlyClaimed;
        if (isCurrentlyClaimed) claimedIds.push(nft.id);
      }
    }
    // update mongo if some nfts are recently claimed
    if (claimedIds.length > 0) {
      //   await this.nftModel.updateMany(
      //     { id: { $in: claimedIds } },
      //     { isClaimed: true },
      //   );
      await this.updateIsClaimed(
        this.configService.get('rotg-collection-name'),
        claimedIds,
      );
    }
    return nfts;
  }

  // private async scrapDeadrare(timestamp: number) {
  //   try {
  //     const deadrareApi = this.configService.get('deadrare-api');
  //     const deadrareApiParams = this.configService.get('deadrare-api-params');
  //     const { data } = await axios.get(deadrareApi + deadrareApiParams);
  //     if (!data.data || !data.data.listAuctions) throw data; // here to check error on sentry
  //     const updateObject = data.data.listAuctions.map((d) => ({
  //       updateOne: {
  //         filter: { id: d.cachedNft.nonce },
  //         update: {
  //           market: {
  //             source: 'deadrare',
  //             identifier: d.nftId,
  //             type: 'buy',
  //             bid: null,
  //             token: 'EGLD',
  //             price: +d.price,
  //             currentUsd: EGLD_RATE ? +(EGLD_RATE * d.price).toFixed(2) : null,
  //           },
  //           timestamp,
  //         },
  //       },
  //     }));
  //     return this.nftModel.bulkWrite(updateObject);
  //   } catch (error) {
  //     this.client.instance().captureException(error);
  //     throw error;
  //   }
  // }
}
