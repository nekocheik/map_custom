import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Matches,
  IsNumberString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { filters } from '../schemas/nft.filters';

export class GetIdDto {
  // 1 to 9999
  @Matches(/^([1-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9])$/)
  @ApiProperty({
    description: 'id of nft',
  })
  readonly id: number;
}

class NFTFilters {
  @ApiPropertyOptional({
    description: 'id of nft',
  })
  @IsOptional()
  @Matches(/^([1-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9])$/)
  readonly id?: number;
  @ApiPropertyOptional({
    description: 'Guardian background',
    enum: filters.background,
  })
  @IsOptional()
  @IsEnum(filters.background)
  readonly background?: string;

  @ApiPropertyOptional({
    description: 'check if nft claimed',
    enum: ['true', 'false'],
  })
  @IsOptional()
  @Transform((b) => b.value === 'true')
  @IsBoolean()
  readonly isClaimed?: boolean;

  @ApiPropertyOptional({
    description: 'Guardian crown type',
    enum: filters.crown,
  })
  @IsOptional()
  @IsEnum(filters.crown)
  readonly crown?: string;

  @ApiPropertyOptional({
    description: 'Guardian hairstyle type',
    enum: filters.hairstyle,
  })
  @IsOptional()
  @IsEnum(filters.hairstyle)
  readonly hairstyle?: string;

  @ApiPropertyOptional({
    description: 'Guardian hairstyle color',
    enum: filters.hairstyleColor,
  })
  @IsOptional()
  @IsEnum(filters.hairstyleColor)
  readonly hairstyleColor?: string;

  @ApiPropertyOptional({
    description: 'Guardian eyes type',
    enum: filters.eyes,
  })
  @IsOptional()
  @IsEnum(filters.eyes)
  readonly eyes?: string;

  @ApiPropertyOptional({
    description: 'Guardian eyes color',
    enum: filters.eyesColor,
  })
  @IsOptional()
  @IsEnum(filters.eyesColor)
  readonly eyesColor?: string;

  @ApiPropertyOptional({
    description: 'Guardian crown level',
    enum: filters.crownLevel,
  })
  @IsOptional()
  @Transform((param) => parseInt(param.value))
  @IsEnum(filters.crownLevel)
  readonly crownLevel?: number;

  @ApiPropertyOptional({
    description: 'Guardian armor level',
    enum: filters.armorLevel,
  })
  @IsOptional()
  @Transform((param) => parseInt(param.value))
  @IsEnum(filters.armorLevel)
  readonly armorLevel?: number;

  @ApiPropertyOptional({
    description: 'Guardian weapon level',
    enum: filters.weaponLevel,
  })
  @IsOptional()
  @Transform((param) => parseInt(param.value))
  @IsEnum(filters.weaponLevel)
  readonly weaponLevel?: number;

  @ApiPropertyOptional({
    description: 'Guardian nose type',
    enum: filters.nose,
  })
  @IsOptional()
  @IsEnum(filters.nose)
  readonly nose?: string;

  @ApiPropertyOptional({
    description: 'Guardian mouth type',
    enum: filters.mouth,
  })
  @IsOptional()
  @IsEnum(filters.mouth)
  readonly mouth?: string;

  @ApiPropertyOptional({
    description: 'Guardian mouth color',
    enum: filters.mouthColor,
  })
  @IsOptional()
  @IsEnum(filters.mouthColor)
  readonly mouthColor?: string;

  @ApiPropertyOptional({
    description: 'Guardian armor type',
    enum: filters.armor,
  })
  @IsOptional()
  @IsEnum(filters.armor)
  readonly armor?: string;

  @ApiPropertyOptional({
    description: 'Guardian weapon type',
    enum: filters.weapon,
  })
  @IsOptional()
  @IsEnum(filters.weapon)
  readonly weapon?: string;

  @ApiPropertyOptional({
    description: 'Guardian stone level',
    enum: filters.stone,
  })
  @IsOptional()
  @IsEnum(filters.stone)
  readonly stone?: string;
}

export class GetErdDto {
  @Matches(/^erd.*/)
  @ApiProperty({
    description: 'elrond wallet address',
  })
  readonly erd: string;
}

export class GetAllDto extends NFTFilters {
  @Matches(/^(id|rank)$/)
  @ApiProperty({
    enum: ['id', 'rank'],
  })
  readonly by: string;
  @Matches(/^(asc|desc)$/)
  @ApiProperty({
    enum: ['asc', 'desc'],
  })
  readonly order: string;
  @Matches(/^([1-9]|[1-9][0-9]|[1-4][0-9][0-9]|500)$/)
  @ApiProperty()
  readonly page: number;
}

export class GetAllDtoLimited extends NFTFilters {
  // 1 to 9999
  @Matches(/^([1-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9])$/)
  @ApiProperty({
    description: 'limit of nfts',
  })
  readonly limit: number;
}

export class GetMarketDto extends NFTFilters {
  @Matches(/^(id|rank|price|viewed|latest)$/)
  @ApiProperty({
    enum: ['id', 'rank', 'price', 'viewed', 'latest'],
  })
  readonly by: string;
  @Matches(/^(asc|desc)$/)
  @ApiProperty({
    enum: ['asc', 'desc'],
  })
  readonly order: string;
  @IsNumberString()
  @Matches(/[^0]+/)
  @ApiProperty()
  readonly page: number;
  @IsNumberString()
  @Matches(/[^0]+/)
  @IsOptional()
  @ApiPropertyOptional({
    default: 20,
  })
  readonly count: number;
  @Matches(/^(buy|bid)$/)
  @IsOptional()
  @ApiPropertyOptional({
    enum: ['buy', 'bid'],
  })
  readonly type: string;
}
