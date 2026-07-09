import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertInvoiceTemplateDto {
  @ApiProperty({
    example: 'Template facture finale premium',
    description: 'Nom lisible du template utilisé pour ce type de facture',
  })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Facture {{invoiceNumber}} - {{companyName}}',
    description: 'Sujet email suggéré lors de l\'envoi de la facture',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  subject?: string;

  @ApiProperty({
    example:
      'Bonjour {{clientName}},\n\nVeuillez trouver votre facture {{invoiceNumber}} de {{totalTtc}} {{currency}}.',
    description:
      'Corps du template. Vous pouvez y mettre vos placeholders ({{invoiceNumber}}, {{clientName}}, etc.).',
  })
  @IsString()
  body!: string;

  @ApiPropertyOptional({
    example: 'Raffia Weave Flow - Merci pour votre confiance.',
    description: 'Pied de page du template',
  })
  @IsOptional()
  @IsString()
  footer?: string;
}
