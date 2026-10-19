import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubmissionDestination, SubmissionStatus } from '@prisma/client';

export class SubmitSampleDto {
  @ApiProperty({
    enum: SubmissionDestination,
    example: SubmissionDestination.CHEMICAL,
    description: 'Target Testing Laboratory (MICROBIOLOGY, CHEMICAL, PHYSICAL)',
  })
  @IsEnum(SubmissionDestination)
  @IsNotEmpty()
  destinationLab: SubmissionDestination;

  @ApiProperty({
    enum: SubmissionStatus,
    required: false,
    default: SubmissionStatus.SUBMITTED,
  })
  @IsEnum(SubmissionStatus)
  @IsOptional()
  status?: SubmissionStatus;

  @ApiProperty({
    example: 'Urgent assay and dissolution required for release testing',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateSubmissionStatusDto {
  @ApiProperty({
    enum: SubmissionStatus,
    example: SubmissionStatus.RECEIVED,
  })
  @IsEnum(SubmissionStatus)
  @IsNotEmpty()
  status: SubmissionStatus;

  @ApiProperty({
    example: 'Sample physically received and logged into laboratory incubator log',
    required: false,
  })
  @IsString()
  @IsOptional()
  reasonForChange?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
