import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SampleType, Priority, LaboratoryType } from '@prisma/client';

export class CreateSampleDto {
  @ApiProperty({ example: 'A-0001', required: false, description: 'Readable serial / record number' })
  @IsString()
  @IsOptional()
  accessionNo?: string;

  @ApiProperty({ example: 'SMP-2026-0001', required: false, description: 'Optional custom / manual Sample ID' })
  @IsString()
  @IsOptional()
  sampleCode?: string;

  @ApiProperty({ example: '2026-10-18T14:30:00Z', required: false, description: 'Sampling Date & Time' })
  @IsString()
  @IsOptional()
  samplingDate?: string;

  @ApiProperty({ example: 'Paracetamol 500mg Granules' })
  @IsString()
  @IsNotEmpty()
  materialName: string;

  @ApiProperty({ example: 'Paracetamol 500mg Film-Coated Tablets (USP)', required: false })
  @IsString()
  @IsOptional()
  nomenclature?: string;

  @ApiProperty({ example: 'CP-2026-B892', required: false })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({ example: '2026-10-10', required: false })
  @IsString()
  @IsOptional()
  mfgDate?: string;

  @ApiProperty({ example: '2029-10-09', required: false })
  @IsString()
  @IsOptional()
  expDate?: string;

  @ApiProperty({ example: 'Bilal Raza (Packaging Line 2)', required: false })
  @IsString()
  @IsOptional()
  submittedBy?: string;

  @ApiProperty({ description: 'Target Laboratory (SEF, SAF, PENICILLIN, GENERAL)', default: 'GENERAL', required: false })
  @IsString()
  @IsOptional()
  laboratory?: string;

  @ApiProperty({ example: 'semi-base', description: 'semi-base or formulation', required: false })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({ example: 'Bulk / Blended Product', default: 'Finished Product', required: false })
  @IsString()
  @IsOptional()
  sampleType?: string;

  @ApiProperty({ example: 'Bulk / Blended Product', required: false })
  @IsString()
  @IsOptional()
  stageType?: string;

  @ApiProperty({ example: 'batch-uuid-here', required: false })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiProperty({ example: 'Fine Chem Pharma Supplies Ltd', required: false })
  @IsString()
  @IsOptional()
  sourceSupplier?: string;

  @ApiProperty({ example: 'Manufacturing Unit 2, Granulation Bay 4', required: false })
  @IsString()
  @IsOptional()
  samplingLocation?: string;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0.01)
  sampleQty: number;

  @ApiProperty({ example: 'g' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 'Controlled Room Temp 20-25°C' })
  @IsString()
  @IsOptional()
  storageCondition?: string;

  @ApiProperty({ enum: Priority, default: Priority.ROUTINE })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ example: 'Sample transferred to QC cold storage rack B-12', required: false })
  @IsString()
  @IsOptional()
  chainOfCustody?: string;

  @ApiProperty({ example: 'Assigned to QC Analyst for full compendial release testing', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ example: 'user-uuid-here', required: false })
  @IsString()
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({ example: ['test-spec-id-1', 'test-spec-id-2'], required: false })
  @IsArray()
  @IsOptional()
  testSpecificationIds?: string[];
}
