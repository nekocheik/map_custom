import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { RedisService } from '../../redis/redis.service';
import * as cheerio from 'cheerio';

@Injectable()
export class StatsService {
  public constructor(
    @InjectSentry() private readonly client: SentryService,
    private redisService: RedisService,
  ) {}

  async get() {
    try {
      const cachedData = await this.redisService.get('AQXSTATS');
      if (cachedData) return cachedData;
      const volumeData = await axios.get(
        'https://api.savvyboys.club/collections/GUARDIAN-3d6635/analytics?timeZone=Europe%2FParis&market=secundary&startDate=2021-11-01T00:00:00.000Z&endDate=' +
          new Date().toISOString() +
          '&buckets=1',
      );
      const holderData = await axios.get(
        'https://api.savvyboys.club/collections/GUARDIAN-3d6635/holder_and_supply',
      );
      const twitterData = await axios.get(
        'https://api.livecounts.io/twitter-live-follower-counter/stats/TheAquaverse',
      );
      const floorAverageData = await axios.get(
        'https://api.savvyboys.club/collections/GUARDIAN-3d6635/floor_and_average_price?chartTimeRange=day',
      );
      const xoxnoPage = await axios.get(
        'https://xoxno.com/collection/GUARDIAN-3d6635',
      );
      let floorPrice = null;

      try {
        const cheerioData = cheerio.load(xoxnoPage.data);
        const xoxnoData = cheerioData('#__NEXT_DATA__').html();
        const parsedXoxnoData = JSON.parse(xoxnoData);
        floorPrice = parsedXoxnoData?.props?.pageProps?.initInfoFallback?.floor;
      } catch (e) {}

      const rawEgldVolume =
        volumeData &&
        volumeData.data &&
        volumeData.data.date_histogram &&
        volumeData.data.date_histogram.length > 0
          ? volumeData.data.date_histogram[0].volume
          : null;
      const denum = Math.pow(10, 18);
      const followerCount =
        twitterData && twitterData.data && twitterData.data.followerCount
          ? twitterData.data.followerCount
          : null;
      const totalEgldVolume = rawEgldVolume ? Math.round(rawEgldVolume) : null;
      const holderCount =
        holderData.data && holderData.data.holderCount
          ? holderData.data.holderCount
          : null;
      const floorAverageDataList =
        floorAverageData.data && floorAverageData.data.length > 0
          ? floorAverageData.data
          : [];
      const smallest24hTrade =
        floorAverageDataList.length > 0 && floorAverageDataList[0].floor_price
          ? Math.round((floorAverageDataList[0].floor_price / denum) * 100) /
            100
          : null;

      const oldFloorAverageData =
        floorAverageDataList.length > 1 &&
        floorAverageDataList[floorAverageDataList.length - 1]
          ? floorAverageDataList[floorAverageDataList.length - 1]
          : null;

      const old24hTrade =
        oldFloorAverageData && oldFloorAverageData.floor_price
          ? Math.round((oldFloorAverageData.floor_price / denum) * 100) / 100
          : null;

      const percentage24hTrade =
        smallest24hTrade !== null && old24hTrade !== null
          ? Number(
              ((100 * (smallest24hTrade - old24hTrade)) / old24hTrade).toFixed(
                2,
              ),
            )
          : 0;
      const averagePrice =
        floorAverageDataList.length > 0 && floorAverageDataList[0].average_price
          ? Math.round((floorAverageDataList[0].average_price / denum) * 100) /
            100
          : null;

      const oldAveragePrice =
        oldFloorAverageData && oldFloorAverageData.average_price
          ? Math.round((oldFloorAverageData.average_price / denum) * 100) / 100
          : null;

      const percentageAveragePrice =
        smallest24hTrade !== null && oldAveragePrice !== null
          ? Number(
              (
                (100 * (averagePrice - oldAveragePrice)) /
                oldAveragePrice
              ).toFixed(2),
            )
          : 0;

      const data = {
        twitter: {
          followerCount,
        },
        guardians: {
          smallest24hTrade,
          percentage24hTrade,
          averagePrice,
          percentageAveragePrice,
          holderCount,
          totalEgldVolume,
          floorPrice,
        },
      };
      await this.redisService.set('AQXSTATS', data, 900);
      return data;
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }
}
