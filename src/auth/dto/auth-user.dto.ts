import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ type: String, example: 'usr123' })
  id!: string;

  @ApiProperty({ type: String, example: 'admin@raffia.test' })
  email!: string;

  @ApiProperty({ type: String, required: false, nullable: true, example: 'Admin' })
  name!: string | null;

  @ApiProperty({
    type: String,
    enum: [
      'GERANT',
      'RESPONSABLE_GENERAL',
      'RESPONSABLE_PRODUCTION',
      'RESPONSABLE_LIVRAISON',
      'RESPONSABLE_FINANCIER_STOCKS',
    ],
  })
  role!: string;

  @ApiProperty({ type: Boolean, example: true })
  isAdmin!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
