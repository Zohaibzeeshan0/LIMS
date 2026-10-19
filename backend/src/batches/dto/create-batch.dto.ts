import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BatchStatus {
  QUARANTINE = 'QUARANTINE',
  RELEASED = 'RELEASED',
  REJECTED = 'REJECTED',
  CONDITIONAL = 'CONDITIONAL',
}

export class CreateBatchDto {
  @ApiProperty({ example: 'CP-2026-B892' })
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @ApiProperty({ example: 'Paracetamol 500mg Film-Coated Tablets' })
  @IsString()
  @IsNotEmpty()
  drugProduct: string;

  @ApiProperty({ example: 'Solid Oral Tablet' })
  @IsString()
  @IsNotEmpty()
  dosageForm: string;

  @ApiProperty({ example: '500,000 Tablets' })
  @IsString()
  @IsNotEmpty()
  batchSize: string;

  @ApiProperty({ example: '2026-10-15T00:00:00.000Z' })
  @IsDateString()
  manufacturingDate: string;

  @ApiProperty({ example: '2029-10-15T00:00:00.000Z' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ example: 'Standard commercial batch produced under GMP Master Formula CP-MF-042', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
