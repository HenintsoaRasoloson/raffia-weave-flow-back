import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Galeries Lafayette' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  @IsIn(['B2B', 'B2C'])
  type!: 'B2B' | 'B2C';

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'PROSPECT', 'LOYAL', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'PROSPECT', 'LOYAL', 'INACTIVE'])
  status?: 'ACTIVE' | 'PROSPECT' | 'LOYAL' | 'INACTIVE';

  @ApiPropertyOptional({ example: 'achats@galerieslafayette.fr' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Service achats' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: '89421800300012' })
  @IsOptional()
  @IsString()
  siret?: string;

  @ApiPropertyOptional({ example: '40 boulevard Haussmann' })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '75009' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'France' })
  @IsOptional()
  @IsString()
  country?: string;
}
