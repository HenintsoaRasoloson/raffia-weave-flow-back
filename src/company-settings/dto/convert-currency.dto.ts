import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '../../common/currency/currency.constants';

export class ConvertCurrencyQueryDto {
  @ApiProperty({ example: 10000, description: 'Montant dans la devise source' })
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({
    enum: SUPPORTED_CURRENCIES,
    example: DEFAULT_CURRENCY,
    default: DEFAULT_CURRENCY,
  })
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  from?: CurrencyCode;

  @ApiPropertyOptional({
    enum: SUPPORTED_CURRENCIES,
    example: 'EUR',
    default: 'EUR',
  })
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES])
  to?: CurrencyCode;
}

export class ConvertCurrencyResponseDto {
  @ApiProperty({ example: 10000 })
  amount!: number;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'MGA' })
  from!: CurrencyCode;

  @ApiProperty({ example: 2 })
  convertedAmount!: number;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'EUR' })
  to!: CurrencyCode;

  @ApiProperty({
    example: 5000,
    description: 'Taux appliqué: nombre d’Ariary pour 1 Euro',
  })
  eurToMgaRate!: number;
}
