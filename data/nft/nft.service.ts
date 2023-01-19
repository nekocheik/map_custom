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
  GetErdDto,
  GetIdDto,
  GetMarketDto,
} from './dto/nft.dto';
import { NFT, NFTDocument } from './schemas/nft.schema';
import { Cron } from '@nestjs/schedule';
import { pickBy, identity, isEmpty } from 'lodash';
import { CollectionService } from '../collection/collection.service';
import { scrapMarkets } from './nft.market';
import {
  erdDoGetGeneric,
  erdDoPostGeneric,
} from '../collection/collection.helpers';

let EGLD_RATE = 0;
let RUNNING = false;

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
export class NftService implements OnModuleInit {
  private networkProvider: ApiNetworkProvider;
  public constructor(
    @InjectSentry() private readonly client: SentryService,
    private readonly collectionService: CollectionService,
    private configService: ConfigService<EnvironmentVariables>,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
  ) {
    this.networkProvider = this.configService.get('elrond-network-provider');
  }
  async onModuleInit(): Promise<void> {
    // await this.scrapMarket();
  }
  private async getUserNfts(erd, filters) {
    const apiParams = this.configService.get('elrond-api-params');
    const dataNFTs = await erdDoGetGeneric(
      this.networkProvider,
      `accounts/${erd}${apiParams}`,
    );
    const userNFTIds = dataNFTs.map((x) => x.nonce);
    if (userNFTIds.length === 0) throw new NotFoundException();
    const filtersQuery = this.getFiltersQuery(filters);
    const findQuery = { id: { $in: userNFTIds } };

    return { findQuery, filtersQuery };
  }

  async getByIds(ids: number[]) {
    try {
      const nfts = await this.nftModel.find({ id: { $in: ids } }, '-_id');
      return { nfts };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async findByUser(getErdDto: GetErdDto | GetAllDto) {
    try {
      const { erd } = getErdDto as GetErdDto;
      const { by, order, page } = getErdDto as GetAllDto;
      const { findQuery, filtersQuery } = await this.getUserNfts(
        erd,
        getErdDto,
      );
      const count = 20;
      const offset = count * (page - 1);
      const sortQuery = { [by]: order === 'asc' ? 1 : -1 } as {
        [by: string]: SortValues;
      };
      const nfts = await this.nftModel
        .find({ ...findQuery, ...filtersQuery }, '-_id')
        .sort(sortQuery)
        .skip(offset)
        .limit(count);
      const totalCount = await this.nftModel.count({
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

  async findByUserLimited(getErdDto: GetErdDto | GetAllDtoLimited) {
    try {
      const { erd } = getErdDto as GetErdDto;
      const { limit } = getErdDto as GetAllDtoLimited;
      const { findQuery, filtersQuery } = await this.getUserNfts(
        erd,
        getErdDto,
      );
      const nfts = await this.nftModel
        .find({ ...findQuery, ...filtersQuery }, '-_id')
        .limit(limit);
      const totalCount = await this.nftModel.count({
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
      const { erd } = getErdDto as GetErdDto;
      const { findQuery, filtersQuery } = await this.getUserNfts(
        erd,
        getErdDto,
      );
      const totalCount = await this.nftModel.count({
        ...findQuery,
        ...filtersQuery,
      });
      return { totalCount };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async findById(getIdDto: GetIdDto) {
    try {
      const { id } = getIdDto;
      const record = await this.nftModel.findOneAndUpdate(
        { id },
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
      const { id } = getFindByIdPrefix as GetIdDto;
      const nfts = await this.nftModel
        .find({
          idName: new RegExp('^' + id),
        })
        .limit(40);
      return { nfts };
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
      stone: dto.stone,
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
      const { by, order, page } = getAllDto;
      const findQuery = this.getFiltersQuery(getAllDto);
      const count = 20;
      const offset = count * (page - 1);
      const sortQuery = { [by]: order === 'asc' ? 1 : -1 } as {
        [by: string]: SortValues;
      };
      let nfts = await this.nftModel
        .find(findQuery, '-_id')
        .sort(sortQuery)
        .skip(offset)
        .limit(count);
      const totalCount = isEmpty(findQuery)
        ? 9999
        : await this.nftModel.count(findQuery);
      if (findQuery.isClaimed === false) {
        const updatedNfts = await this.updateIsClaimed(nfts);
        nfts = updatedNfts.filter((n) => n.isClaimed === false);
      }
      return { nfts, totalCount, pageCount: Math.ceil(totalCount / count) };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
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

      const nfts = await this.nftModel
        .find(findQuery, '-_id -timestamp')
        .sort(sortQuery)
        .skip(offset)
        .limit(count);
      const totalCount = await this.nftModel.count(findQuery);
      return { nfts, totalCount, pageCount: Math.ceil(totalCount / count) };
    } catch (error) {
      console.log(error.response);
      this.client.instance().captureException(error);
      throw error;
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

  @Cron('*/30 * * * * *')
  private async scrapMarket() {
    try {
      if (RUNNING) return;
      RUNNING = true;
      await this.updateEgldRate();
      const timestamp: number = new Date().getTime();
      // await this.fullScrapTrustmarket('bid', timestamp);
      // await this.fullScrapTrustmarket('buy', timestamp);
      // await this.scrapDeadrare(timestamp);
      await scrapMarkets(this.nftModel, EGLD_RATE, timestamp);
      await this.nftModel.updateMany(
        { timestamp: { $exists: true, $ne: timestamp } },
        { $unset: { market: 1, timestamp: 1 } },
      );
      RUNNING = false;
    } catch (error) {
      console.log(error);
      this.client.instance().captureException(error);
    }
  }
  private async scrapTrustmarket(
    type: 'bid' | 'buy',
    offset: number,
    count: number,
    timestamp: number,
  ) {
    try {
      const trustmarketApi = this.configService.get('trustmarket-api');
      const { data } = await axios.post(trustmarketApi, {
        filters: {
          onSale: true,
          auctionTypes: type === 'bid' ? ['NftBid'] : ['Nft'],
        },
        collection: 'GUARDIAN-3d6635',
        skip: offset,
        top: count,
        select: ['onSale', 'saleInfoNft', 'identifier', 'nonce'],
      });
      if (!data.results || data.results.length === 0) return true;
      if (type === 'buy') {
        const nftSample = data.results[0];
        EGLD_RATE =
          nftSample.saleInfoNft?.usd / nftSample.saleInfoNft?.max_bid_short;
      }
      const isLast: boolean = offset + data.resultsCount === data.count;
      const updateObject = data.results.map((d) => ({
        updateOne: {
          filter: { id: d.nonce },
          update: {
            market: {
              source:
                d.saleInfoNft?.marketplace === 'DR'
                  ? 'deadrare'
                  : 'trustmarket',
              identifier: d.identifier,
              type: d.saleInfoNft?.auction_type === 'NftBid' ? 'bid' : 'buy',
              bid:
                d.saleInfoNft?.auction_type !== 'NftBid'
                  ? null
                  : {
                      min: d.saleInfoNft?.min_bid_short,
                      current: d.saleInfoNft?.current_bid_short,
                      deadline: getTimeUntil(d.saleInfoNft?.deadline),
                    },
              token: d.saleInfoNft?.accepted_payment_token,
              price: d.saleInfoNft?.max_bid_short,
              currentUsd: +d.saleInfoNft?.usd,
              timestamp: +d.saleInfoNft?.timestamp,
            },
            timestamp,
          },
        },
      }));
      await this.nftModel.bulkWrite(updateObject);
      return isLast;
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  private async fullScrapTrustmarket(type: 'bid' | 'buy', timestamp: number) {
    let isFinished = false;
    let offset = 0;
    const count = 200;
    while (!isFinished) {
      isFinished = await this.scrapTrustmarket(type, offset, count, timestamp);
      offset += count;
    }
  }

  private async scrapDeadrare(timestamp: number) {
    try {
      const deadrareApi = this.configService.get('deadrare-api');
      const deadrareApiParams = this.configService.get('deadrare-api-params');
      const { data } = await axios.get(deadrareApi + deadrareApiParams);
      if (!data.data || !data.data.listAuctions) throw data; // here to check error on sentry
      const updateObject = data.data.listAuctions.map((d) => ({
        updateOne: {
          filter: { id: d.cachedNft.nonce },
          update: {
            market: {
              source: 'deadrare',
              identifier: d.nftId,
              type: 'buy',
              bid: null,
              token: 'EGLD',
              price: +d.price,
              currentUsd: EGLD_RATE ? +(EGLD_RATE * d.price).toFixed(2) : null,
            },
            timestamp,
          },
        },
      }));
      return this.nftModel.bulkWrite(updateObject);
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async updateIsClaimed(nfts) {
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
      await this.nftModel.updateMany(
        { id: { $in: claimedIds } },
        { isClaimed: true },
      );
      await this.collectionService.updateIsClaimed(
        this.configService.get('rotg-collection-name'),
        claimedIds,
      );
      await this.collectionService.updateIsClaimed(
        this.configService.get('nft-collection-name'),
        claimedIds,
      );
    }
    return nfts;
  }

  async claimByIds(ids: number[]): Promise<{ nfts: any }> {
    try {
      const nfts = await this.nftModel.find({ id: { $in: ids } }, '-_id');
      const updatedNfts = await this.updateIsClaimed(nfts);
      return { nfts: updatedNfts };
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }
}
