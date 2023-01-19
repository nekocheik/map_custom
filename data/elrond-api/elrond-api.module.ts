import { Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { ElrondApiController } from './elrond-api.controller';
import { ElrondApiService } from './elrond-api.service';

@Module({
  controllers: [ElrondApiController],
  providers: [ElrondApiService],
  imports: [RedisModule],
})
export class ElrondApiModule {}
