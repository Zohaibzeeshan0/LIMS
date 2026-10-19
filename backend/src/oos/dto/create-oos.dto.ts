import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOosDto {
  @ApiProperty({ example: 'sample-test-uuid-here' })
  @IsString()
  @IsNotEmpty()
  sampleTestId: string;

  @ApiProperty({ example: 'sample-uuid-here' })
  @IsString()
  @IsNotEmpty()
  sampleId: string;

  @ApiProperty({ example: 'INSTRUMENT_CALIBRATION' })
  @IsString()
  @IsOptional()
  rootCauseCategory?: string;

  @ApiProperty({ example: 'Immediate containment: quarantined remaining sample, flagged instrument for verification', required: false })
  @IsString()
  @IsOptional()
  capaDescription?: string;
}
