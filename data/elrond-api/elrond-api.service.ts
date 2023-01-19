import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { EnvironmentVariables } from 'src/config/configuration.d';
import { ApiNetworkProvider } from '@elrondnetwork/erdjs-network-providers';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ElrondApiService {
  private networkProvider: ApiNetworkProvider;
  private env: string;
  public constructor(
    @InjectSentry() private readonly client: SentryService,
    private configService: ConfigService<EnvironmentVariables>,
    private redisService: RedisService,
  ) {
    this.networkProvider = this.configService.get('elrond-network-provider');
    this.env = this.configService.get('env');
  }

  async get(route) {
    try {
      const redisKey = this.env + route;
      const cachedData = await this.redisService.get(redisKey);
      if (cachedData) return cachedData;
      const data = await this.networkProvider.doGetGeneric(route);
      await this.redisService.set(redisKey, data, 4);
      return data;
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }

  async post(route, payload) {
    try {
      const redisKey = this.env + route + JSON.stringify(payload);
      const cachedData = await this.redisService.get(redisKey);
      if (cachedData) return cachedData;
      const data = await this.networkProvider.doPostGeneric(route, payload);
      await this.redisService.set(redisKey, data, 4);
      return data;
    } catch (error) {
      this.client.instance().captureException(error);
      throw error;
    }
  }
}
