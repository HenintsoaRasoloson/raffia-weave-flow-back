import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

const LEDGER_ENTRY_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;

export class CreateLedgerCategoryDto {
  @ApiProperty({ example: 'PAYROLL' })
  @IsString()
  @Length(2, 40)
  code!: string;

  @ApiProperty({ example: 'Salaires' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ enum: LEDGER_ENTRY_TYPES, example: 'EXPENSE' })
  @IsIn([...LEDGER_ENTRY_TYPES])
  entryType!: (typeof LEDGER_ENTRY_TYPES)[number];

  @ApiPropertyOptional({ example: 'Charges de personnel et primes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}