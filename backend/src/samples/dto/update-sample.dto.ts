import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SampleType, Priority } from './create-sample.dto';
import { SampleStatus } from '@prisma/client';

export class UpdateSampleDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  recordNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sampleId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  laboratoryId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nomenclature?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  stageType?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quantityUnit?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  batchLotNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  manufacturingDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  submittedByUserId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  receivedByUserId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sampledAt?: string;

  @ApiProperty({ enum: SampleStatus, required: false })
  @IsEnum(SampleStatus)
  @IsOptional()
  status?: SampleStatus;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cancellationReason?: string;

  // Backwards compatibility fields
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  accessionNo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sampleCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mfgDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  expDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  submittedBy?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  sampleQty?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  samplingLocation?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sampleType?: string;

  @ApiProperty({ enum: Priority, required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  storageCondition?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  chainOfCustody?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ required: false, description: 'Reason for modification (21 CFR Part 11 Audit Trail)' })
  @IsString()
  @IsOptional()
  reasonForChange?: string;
}
