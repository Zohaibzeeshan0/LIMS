import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TestCategory } from '@prisma/client';

export class CreateSpecificationDto {
  @ApiProperty({ example: 'SPEC-ASSAY-PARACETAMOL' })
  @IsString()
  @IsNotEmpty()
  testCode: string;

  @ApiProperty({ example: 'Assay by HPLC (Paracetamol)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: TestCategory, default: TestCategory.CHROMATOGRAPHY })
  @IsEnum(TestCategory)
  category: TestCategory;

  @ApiProperty({ example: 'USP <621>' })
  @IsString()
  @IsOptional()
  pharmacopeiaMethod?: string;

  @ApiProperty({ example: 98.0, required: false })
  @IsNumber()
  @IsOptional()
  defaultMinLimit?: number;

  @ApiProperty({ example: 102.0, required: false })
  @IsNumber()
  @IsOptional()
  defaultMaxLimit?: number;

  @ApiProperty({ example: 100.0, required: false })
  @IsNumber()
  @IsOptional()
  defaultTarget?: number;

  @ApiProperty({ example: '%', required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 'Isocratic C18 reverse-phase HPLC, UV detection at 243nm', required: false })
  @IsString()
  @IsOptional()
  procedureOverview?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  requiresInstrument?: boolean;
}
