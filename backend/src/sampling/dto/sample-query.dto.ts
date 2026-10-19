import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SampleType, Priority, SampleStatus } from '@prisma/client';

export class SamplingQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ enum: SampleStatus, required: false })
  @IsEnum(SampleStatus)
  @IsOptional()
  status?: SampleStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sampleType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  stageType?: string;

  @ApiProperty({ enum: Priority, required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiProperty({ required: false, description: 'Filter by Laboratory (SAF, PENICILLIN, GENERAL)' })
  @IsString()
  @IsOptional()
  laboratory?: string;

  @ApiProperty({ required: false, description: 'Search specifically by Sample ID (e.g. SMP-2026-0001)' })
  @IsString()
  @IsOptional()
  sampleId?: string;

  @ApiProperty({ required: false, description: 'Search specifically by Nomenclature / Product Name' })
  @IsString()
  @IsOptional()
  nomenclature?: string;

  @ApiProperty({ required: false, description: 'Search specifically by Batch / Lot Number' })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiProperty({ required: false, description: 'Start date filter for sampling (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date filter for sampling (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  limit?: number | string;

  @ApiProperty({ required: false, default: 'samplingDate' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
