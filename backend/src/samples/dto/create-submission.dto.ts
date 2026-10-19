import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'SAF Lab', description: 'Destination Laboratory name or identifier' })
  @IsString()
  @IsNotEmpty()
  destinationLaboratory: string;

  @ApiProperty({ example: 'lab-uuid-here', required: false })
  @IsString()
  @IsOptional()
  destinationLabId?: string;

  @ApiProperty({ example: 'Route sample for urgent compendial sterility & endotoxin assay', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
