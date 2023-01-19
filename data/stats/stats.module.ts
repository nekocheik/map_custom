import { Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService],
  imports: [RedisModule],
})
export class StatsModule {}
