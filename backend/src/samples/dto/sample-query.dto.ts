import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SampleType, Priority } from './create-sample.dto';
import { SampleStatus } from '@prisma/client';

export class SampleQueryDto {
  @ApiProperty({ required: false, description: 'General full-text search across Sample ID, Record Number, Nomenclature, Batch/Lot' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by Status or comma-separated statuses' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, description: 'Filter by stage type (e.g. RAW_MATERIAL, IN_PROCESS, FINISHED_PRODUCT)' })
  @IsString()
  @IsOptional()
  stageType?: string;

  @ApiProperty({ required: false, description: 'Filter by stage or sample type' })
  @IsString()
  @IsOptional()
  sampleType?: string;

  @ApiProperty({ required: false, description: 'Filter by Priority or comma-separated priorities (e.g. STAT,URGENT)' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ required: false, description: 'Filter by Laboratory UUID' })
  @IsString()
  @IsOptional()
  laboratoryId?: string;

  @ApiProperty({ required: false, description: 'Filter by Laboratory Name or Code (SAF, PENICILLIN, GENERAL)' })
  @IsString()
  @IsOptional()
  laboratory?: string;

  @ApiProperty({ required: false, description: 'Filter specifically by Sample ID (e.g. SMP-2026-0001)' })
  @IsString()
  @IsOptional()
  sampleId?: string;

  @ApiProperty({ required: false, description: 'Filter specifically by Record Number (e.g. REC-2026-0001)' })
  @IsString()
  @IsOptional()
  recordNumber?: string;

  @ApiProperty({ required: false, description: 'Filter specifically by Nomenclature / Product Name' })
  @IsString()
  @IsOptional()
  nomenclature?: string;

  @ApiProperty({ required: false, description: 'Filter specifically by Batch / Lot Number' })
  @IsString()
  @IsOptional()
  batchLotNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiProperty({ required: false, description: 'Filter by archival state (true/false)' })
  @IsOptional()
  isArchived?: boolean | string;

  @ApiProperty({ required: false, description: 'Start date filter for sampling (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date filter for sampling (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Lab Section filter (semi-base or formulation)' })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({ required: false, default: 1, description: 'Page number for pagination' })
  @IsOptional()
  page?: number | string;

  @ApiProperty({ required: false, default: 10, description: 'Number of items per page' })
  @IsOptional()
  limit?: number | string;

  @ApiProperty({ required: false, default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
