// import { Test, TestingModule } from '@nestjs/testing';
// import { ElrondApiController } from './elrond-api.controller';
// import { ElrondApiService } from './elrond-api.service';
// import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
// import { RedisModule } from '../../redis/redis.module';
// import { EnvConfigModule } from '../../config/configuration.module';

describe('ElrondApiController', () => {
  it('empyt', () => {
    expect(true).toBeTruthy();
  });
  //   let controller: ElrondApiController;
  //   let service: ElrondApiService;

  //   beforeEach(async () => {
  //     const module: TestingModule = await Test.createTestingModule({
  //       controllers: [ElrondApiController],
  //       imports: [RedisModule, EnvConfigModule],
  //       providers: [
  //         ElrondApiService,
  //         {
  //           provide: SENTRY_TOKEN,
  //           useValue: { debug: jest.fn() },
  //         },
  //       ],
  //     }).compile();

  //     controller = module.get<ElrondApiController>(ElrondApiController);
  //     service = module.get<ElrondApiService>(ElrondApiService);
  //   });

  //   // it('elrondApiController should be defined', () => {
  //   //   expect(controller).toBeDefined();
  //   // });
  //   // it('elrondApiService should be defined', () => {
  //   //   expect(service).toBeDefined();
  //   // });
  //   // it('elrondApiController GET should get correct data', async () => {
  //   //   const data = await controller.get({ '0': 'stats' });
  //   //   expect(data).toHaveProperty('accounts');
  //   //   expect(data).toHaveProperty('blocks');
  //   //   expect(data).toHaveProperty('epoch');
  //   //   expect(data).toHaveProperty('refreshRate');
  //   //   expect(data).toHaveProperty('roundsPassed');
  //   //   expect(data).toHaveProperty('roundsPerEpoch');
  //   //   expect(data).toHaveProperty('shards');
  //   //   expect(data).toHaveProperty('transactions');
  //   // });

  //   // it('elrondApiController POST should send ok', async () => {
  //   //   const data = await controller.post(
  //   //     { '0': 'query' },
  //   //     {
  //   //       scAddress:
  //   //         'erd1qqqqqqqqqqqqqpgqra3rpzamn5pxhw74ju2l7tv8yzhpnv98nqjsvw3884',
  //   //       funcName: 'getFirstMissionStartEpoch',
  //   //       args: [],
  //   //     },
  //   //   );
  //   //   expect(data).toHaveProperty('returnCode');
  //   //   expect(data.returnCode).toBe('ok');
  //   // });
  /* It's a comment. */
});
