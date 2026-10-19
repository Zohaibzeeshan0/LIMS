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
import { LaboratoryType, SampleStatus } from '@prisma/client';

export enum SampleType {
  RAW_MATERIAL = 'RAW_MATERIAL',
  IN_PROCESS = 'IN_PROCESS',
  FINISHED_PRODUCT = 'FINISHED_PRODUCT',
  STABILITY = 'STABILITY',
  WATER_PURIFIED = 'WATER_PURIFIED',
  ENVIRONMENTAL_SWAB = 'ENVIRONMENTAL_SWAB',
}

export enum Priority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export class CreateSampleDto {
  // Required Entities per Specification
  @ApiProperty({ example: 'REC-2026-0001', required: false, description: 'Sequential or system record number' })
  @IsString()
  @IsOptional()
  recordNumber?: string;

  @ApiProperty({ example: 'SMP-2026-0001', required: false, description: 'Globally unique Sample Identifier' })
  @IsString()
  @IsOptional()
  sampleId?: string;

  @ApiProperty({ example: 'lab-uuid-here', required: false, description: 'Target Laboratory ID' })
  @IsString()
  @IsOptional()
  laboratoryId?: string;

  @ApiProperty({ example: 'Paracetamol 500mg Film-Coated Tablets (USP/BP)', description: 'Product / chemical nomenclature' })
  @IsString()
  @IsNotEmpty()
  nomenclature: string;

  @ApiProperty({ example: 'FINISHED_PRODUCT', default: 'FINISHED_PRODUCT', required: false })
  @IsString()
  @IsOptional()
  stageType?: string;

  @ApiProperty({ example: 250, description: 'Sample intake quantity' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 'g', description: 'Quantity unit of measure (e.g. g, tablets, mL, vials)' })
  @IsString()
  @IsNotEmpty()
  quantityUnit: string;

  @ApiProperty({ example: 'CP-2026-B892', required: false, description: 'Manufacturing Batch or Lot Number' })
  @IsString()
  @IsOptional()
  batchLotNumber?: string;

  @ApiProperty({ example: '2026-10-10', required: false, description: 'Manufacturing Date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  manufacturingDate?: string;

  @ApiProperty({ example: '2029-10-09', required: false, description: 'Expiry Date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ example: 'user-uuid-submitter', required: false, description: 'User ID of submitter' })
  @IsString()
  @IsOptional()
  submittedByUserId?: string;

  @ApiProperty({ example: 'user-uuid-receiver', required: false, description: 'User ID of receiver' })
  @IsString()
  @IsOptional()
  receivedByUserId?: string;

  @ApiProperty({ example: '2026-10-18T14:30:00Z', required: false, description: 'Timestamp when sample was drawn' })
  @IsString()
  @IsOptional()
  sampledAt?: string;

  @ApiProperty({ enum: SampleStatus, default: SampleStatus.RECEIVED, required: false })
  @IsEnum(SampleStatus)
  @IsOptional()
  status?: SampleStatus;

  // Additional fields for reliable business workflows & backwards compatibility
  @ApiProperty({ example: 'A-0001', required: false, description: 'Accession number alias' })
  @IsString()
  @IsOptional()
  accessionNo?: string;

  @ApiProperty({ example: 'SMP-2026-0001', required: false, description: 'Sample code alias' })
  @IsString()
  @IsOptional()
  sampleCode?: string;

  @ApiProperty({ example: 'Paracetamol 500mg Granules', required: false })
  @IsString()
  @IsOptional()
  materialName?: string;

  @ApiProperty({ example: 250, required: false })
  @IsNumber()
  @IsOptional()
  sampleQty?: number;

  @ApiProperty({ example: 'g', required: false })
  @IsString()
  @IsOptional()
  unit?: string;

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

  @ApiProperty({ example: '2026-10-18T14:30:00Z', required: false })
  @IsString()
  @IsOptional()
  samplingDate?: string;

  @ApiProperty({ example: 'Bilal Raza', required: false })
  @IsString()
  @IsOptional()
  submittedBy?: string;

  @ApiProperty({ example: 'Bulk / Blended Product', required: false })
  @IsString()
  @IsOptional()
  sampleType?: string;

  @ApiProperty({ enum: LaboratoryType, required: false })
  @IsEnum(LaboratoryType)
  @IsOptional()
  laboratory?: LaboratoryType;

  @ApiProperty({ enum: Priority, default: Priority.ROUTINE, required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ example: 'Controlled Room Temp 20-25°C', required: false })
  @IsString()
  @IsOptional()
  storageCondition?: string;

  @ApiProperty({ example: 'Manufacturing Unit 2, Granulation Bay 4', required: false })
  @IsString()
  @IsOptional()
  samplingLocation?: string;

  @ApiProperty({ example: 'Fine Chem Pharma Supplies Ltd', required: false })
  @IsString()
  @IsOptional()
  sourceSupplier?: string;

  @ApiProperty({ example: 'batch-uuid-here', required: false })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiProperty({ example: 'user-uuid-here', required: false })
  @IsString()
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({ example: 'Transferred via pass-through airlock', required: false })
  @IsString()
  @IsOptional()
  chainOfCustody?: string;

  @ApiProperty({ example: 'Urgent release testing requested', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ example: ['test-spec-id-1'], required: false })
  @IsArray()
  @IsOptional()
  testSpecificationIds?: string[];
}
