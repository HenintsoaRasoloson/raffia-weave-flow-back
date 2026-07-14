import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Galeries Lafayette' })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'B2B',
    enum: ['B2B', 'B2C'],
    description: 'Canal commercial. Orthogonal a legalForm (B2C entreprise possible).',
  })
  @IsIn(['B2B', 'B2C'])
  type!: 'B2B' | 'B2C';

  @ApiPropertyOptional({
    example: 'COMPANY',
    enum: ['INDIVIDUAL', 'COMPANY'],
    default: 'INDIVIDUAL',
    description:
      'INDIVIDUAL = personne physique, COMPANY = personne morale / entreprise',
  })
  @IsOptional()
  @IsIn(['INDIVIDUAL', 'COMPANY'])
  legalForm?: 'INDIVIDUAL' | 'COMPANY';

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'PROSPECT', 'LOYAL', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'PROSPECT', 'LOYAL', 'INACTIVE'])
  status?: 'ACTIVE' | 'PROSPECT' | 'LOYAL' | 'INACTIVE';

  @ApiPropertyOptional({
    example: 'achats@galerieslafayette.fr',
    description: 'Email du responsable (obligatoire si COMPANY)',
  })
  @ValidateIf(
    (o: CreateClientDto) => (o.legalForm ?? 'INDIVIDUAL') === 'COMPANY',
  )
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+261340000000',
    description: 'Telephone du responsable (obligatoire si COMPANY)',
  })
  @ValidateIf(
    (o: CreateClientDto) => (o.legalForm ?? 'INDIVIDUAL') === 'COMPANY',
  )
  @IsNotEmpty()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Service achats',
    description: 'Nom du responsable (obligatoire si COMPANY)',
  })
  @ValidateIf(
    (o: CreateClientDto) => (o.legalForm ?? 'INDIVIDUAL') === 'COMPANY',
  )
  @IsNotEmpty()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'NIF Madagascar (obligatoire si COMPANY)',
  })
  @ValidateIf(
    (o: CreateClientDto) => (o.legalForm ?? 'INDIVIDUAL') === 'COMPANY',
  )
  @IsNotEmpty()
  @IsString()
  nif?: string;

  @ApiPropertyOptional({
    example: '12345 11 2020 0 12345',
    description: 'STAT Madagascar (obligatoire si COMPANY)',
  })
  @ValidateIf(
    (o: CreateClientDto) => (o.legalForm ?? 'INDIVIDUAL') === 'COMPANY',
  )
  @IsNotEmpty()
  @IsString()
  stat?: string;

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
