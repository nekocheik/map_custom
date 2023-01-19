import { Controller, Get, Param, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NftService } from './nft.service';
import {
  GetAllDto,
  GetAllDtoLimited,
  GetErdDto,
  GetIdDto,
  GetMarketDto,
} from './dto/nft.dto';

@ApiTags('nft')
@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Get('user/:erd')
  getByErd(@Param() getErdDto: GetErdDto, @Query() getAllDto: GetAllDto) {
    return this.nftService.findByUser({ ...getErdDto, ...getAllDto });
  }

  @Get('user/:erd/count')
  getCountByErd(@Param() getErdDto: GetErdDto, @Query() getAllDto: GetAllDto) {
    return this.nftService.findUserNftCount({ ...getErdDto, ...getAllDto });
  }

  @Get('user/:erd/limited')
  getByErdLimited(
    @Param() getErdDto: GetErdDto,
    @Query() getAllDto: GetAllDtoLimited,
  ) {
    return this.nftService.findByUserLimited({ ...getErdDto, ...getAllDto });
  }

  @Get('id/:id')
  getById(@Param() getIdDto: GetIdDto) {
    return this.nftService.findById(getIdDto);
  }

  @Get('search/:id')
  getByIdPrefix(@Param() getIdDto: GetIdDto) {
    return this.nftService.findByIdPrefix(getIdDto);
  }

  @Get('ids/:ids')
  getByIds(
    @Param('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
    ids: number[],
  ) {
    return this.nftService.getByIds(ids);
  }

  @Get('claim/:ids')
  claimByIds(
    @Param('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
    ids: number[],
  ) {
    return this.nftService.claimByIds(ids);
  }

  @Get('all')
  getAll(@Query() getAllDto: GetAllDto) {
    return this.nftService.findAll(getAllDto);
  }

  @Get('market')
  getByMarket(@Query() getMarketDto: GetMarketDto) {
    return this.nftService.findByMarket(getMarketDto);
  }
}
