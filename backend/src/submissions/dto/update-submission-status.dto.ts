import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';

export class UpdateSubmissionStatusDto {
  @ApiProperty({
    enum: SubmissionStatus,
    example: SubmissionStatus.RECEIVED,
    description: 'New workflow status for the sample submission',
  })
  @IsEnum(SubmissionStatus)
  @IsNotEmpty()
  status: SubmissionStatus;

  @ApiProperty({ example: 'Sample safely received in sterile transfer airlock Room 104', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ example: 'Verified receipt with intact tamper-evident seal', required: false })
  @IsString()
  @IsOptional()
  reasonForChange?: string;
}
