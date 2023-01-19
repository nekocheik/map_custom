import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ElrondApiService } from './elrond-api.service';

@ApiTags('elrond-api')
@Controller('elrond-api')
export class ElrondApiController {
  constructor(private readonly elrondApiService: ElrondApiService) {}

  @Get('/*')
  get(@Param() params) {
    return this.elrondApiService.get(params[0]);
  }

  @Post('/*')
  post(@Param() params, @Body() body) {
    return this.elrondApiService.post(params[0], body);
  }
}
