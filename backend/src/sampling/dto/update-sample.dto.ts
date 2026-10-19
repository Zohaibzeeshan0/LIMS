import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SampleType, Priority, SampleStatus } from '@prisma/client';

export class UpdateSampleDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  accessionNo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nomenclature?: string;

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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  stageType?: string;

  @ApiProperty({ enum: Priority, required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ enum: SampleStatus, required: false })
  @IsEnum(SampleStatus)
  @IsOptional()
  status?: SampleStatus;

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

  @ApiProperty({ required: false, description: 'Reason for modification (for 21 CFR Part 11 Audit Trail)' })
  @IsString()
  @IsOptional()
  reasonForChange?: string;
}
