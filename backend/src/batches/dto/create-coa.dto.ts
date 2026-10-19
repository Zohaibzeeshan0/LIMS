import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueCoaDto {
  @ApiProperty({ example: 'batch-uuid-here' })
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @ApiProperty({ example: 'sample-uuid-here', required: false })
  @IsString()
  @IsOptional()
  sampleId?: string;

  @ApiProperty({ example: 'Batch conforms to USP 44-NF 39 compendial specifications. Released for market distribution.', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
