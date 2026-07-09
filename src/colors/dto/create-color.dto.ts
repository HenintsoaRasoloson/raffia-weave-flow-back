import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateColorDto {
  @ApiProperty({ example: 'Naturel' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: '#e8d8b8' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  hex!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
