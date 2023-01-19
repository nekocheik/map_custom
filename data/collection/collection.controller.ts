import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionService } from './collection.service';
import {
  GetAllDto,
  GetAllDtoLimited,
  GetCollectionDto,
  GetErdDto,
  GetIdDto,
  GetIdsDto,
  GetIdentifiersDto,
  GetMarketDto,
  CreateJWTDto,
  GetIdWithoutCollectionDto,
  ROTGModel,
  GetElementDto,
} from './dto/collection.dto';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('collection')
@Controller('collection')
export class CollectionController {
  constructor(
    private readonly collectionService: CollectionService,
    private authService: AuthService,
  ) {}

  @Get(':collection/user/:erd')
  getByErd(@Param() getErdDto: GetErdDto, @Query() getAllDto: GetAllDto) {
    return this.collectionService.findByUser({ ...getErdDto, ...getAllDto });
  }

  @Get(':collection/user/:erd/count')
  getCountByErd(@Param() getErdDto: GetErdDto, @Query() getAllDto: GetAllDto) {
    return this.collectionService.findUserNftCount({
      ...getErdDto,
      ...getAllDto,
    });
  }

  @Get('user/:erd/limited')
  getByErdLimited(
    @Param() getErdDto: GetErdDto,
    @Query() getAllDto: GetAllDtoLimited,
  ) {
    return this.collectionService.findByUserLimited({
      ...getErdDto,
      ...getAllDto,
    });
  }

  @Get(':collection/id/:id')
  getCollectionNftById(@Param() getIdDto: GetIdDto) {
    return this.collectionService.findCollectionNftById(getIdDto);
  }

  @Get(':collection/search/:id')
  getByIdPrefix(@Param() getIdDto: GetIdDto) {
    return this.collectionService.findByIdPrefix(getIdDto);
  }

  @Get('scrapRotg')
  scrapRotg() {
    return this.collectionService.scrapAssets();
  }

  @UseGuards(LocalAuthGuard)
  @Post('/getJWT')
  async login(@Request() req, @Body() createJWT: CreateJWTDto) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/lockMerge/:id')
  @ApiBearerAuth()
  lockMergeV2(@Param() getIdDto: GetIdWithoutCollectionDto) {
    return this.collectionService.lockMergeV2(getIdDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/unlockMerge/:id')
  @ApiBearerAuth()
  unlockMergeV2(
    @Param() getIdDto: GetIdWithoutCollectionDto,
    @Body() rotgModel: ROTGModel,
  ) {
    delete rotgModel.id;
    return this.collectionService.unlockMergeV2({
      ...getIdDto,
      ...rotgModel,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('/unlockForce/:id')
  @ApiBearerAuth()
  forceUnlockTestV2(
    @Param() getIdDto: GetIdWithoutCollectionDto,
    @Body() rotgModel: ROTGModel,
  ) {
    delete rotgModel.id;
    return this.collectionService.forceUnlockTest({
      ...getIdDto,
      ...rotgModel,
    });
  }

  @Get(':collection/ids/:ids')
  getByIds(@Param() getIdsDto: GetIdsDto) {
    getIdsDto.ids = (getIdsDto.ids as unknown as string)
      .split(',')
      .map((idStr) => Number(idStr))
      .filter((id) => !isNaN(id));
    return this.collectionService.getByIds(getIdsDto);
  }

  @Get(':collection/identifiers/:identifiers')
  getByIdentifiers(@Param() getIdentifiersDto: GetIdentifiersDto) {
    getIdentifiersDto.identifiers = (
      getIdentifiersDto.identifiers as unknown as string
    )
      .split(',')
      .filter((identifier) => identifier.length > 0);
    return this.collectionService.getByIdentifiers(getIdentifiersDto);
  }

  @Get(':collection/floor/:element')
  getElementFloorPrice(@Param() getElementDto: GetElementDto) {
    return this.collectionService.getElementFloorPrice(getElementDto);
  }

  @Get(':collection/all')
  getAll(
    @Param() getCollectionDto: GetCollectionDto,
    @Query() getAllDto: GetAllDto,
  ) {
    return this.collectionService.findAll({
      ...getCollectionDto,
      ...getAllDto,
    });
  }

  // @Get(':collcetion/market')
  // getByMarket(
  //   @Param() getCollectionDto: GetCollectionDto,
  //   @Query() getMarketDto: GetMarketDto,
  // ) {
  //   return this.collectionService.findByMarket(getMarketDto);
  // }
}
