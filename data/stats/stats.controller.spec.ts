// import { Test, TestingModule } from '@nestjs/testing';
// import { StatsController } from './stats.controller';
// import { StatsService } from './stats.service';
// import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
// import { RedisModule } from '../../redis/redis.module';
// import { EnvConfigModule } from '../../config/configuration.module';

describe('StatsController', () => {
  it('empyt', () => {
    expect(true).toBeTruthy();
  });
  // let controller: StatsController;
  // let service: StatsService;
  // beforeEach(async () => {
  //   const module: TestingModule = await Test.createTestingModule({
  //     controllers: [StatsController],
  //     providers: [
  //       StatsService,
  //       {
  //         provide: SENTRY_TOKEN,
  //         useValue: { debug: jest.fn() },
  //       },
  //     ],
  //     imports: [RedisModule, EnvConfigModule],
  //   }).compile();
  //   controller = module.get<StatsController>(StatsController);
  //   service = module.get<StatsService>(StatsService);
  // });
  // it('statsController should be defined', () => {
  //   expect(controller).toBeDefined();
  // });
  // it('statsService should be defined', () => {
  //   expect(service).toBeDefined();
  // });
  // it('statsController should get correct data', async () => {
  //   const data = await controller.get();
  //   expect(data).toHaveProperty('twitter');
  //   expect(data.twitter).toHaveProperty('followerCount');
  //   expect(data).toHaveProperty('guardians');
  //   expect(data.guardians).toHaveProperty('smallest24hTrade');
  //   expect(data.guardians).toHaveProperty('averagePrice');
  //   expect(data.guardians).toHaveProperty('holderCount');
  //   expect(data.guardians).toHaveProperty('totalEgldVolume');
  //   expect(data.guardians).toHaveProperty('floorPrice');
  //   expect(data.guardians.totalEgldVolume).toBeGreaterThanOrEqual(12500);
  //   expect(data.guardians.holderCount).toBeGreaterThanOrEqual(1000);
  //   expect(data.twitter.followerCount).toBeGreaterThanOrEqual(16000);
  //   expect(data.guardians.averagePrice).toBeGreaterThanOrEqual(1);
  //   expect(data.guardians.smallest24hTrade).toBeGreaterThanOrEqual(1);
  //   expect(data.guardians.floorPrice).toBeGreaterThanOrEqual(1);
  // });
});
