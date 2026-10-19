import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordResultDto {
  @ApiProperty({ example: 99.8, required: false })
  @IsNumber()
  @IsOptional()
  numericResult?: number;

  @ApiProperty({ example: 'Clear colorless solution, free from visible particulates', required: false })
  @IsString()
  @IsOptional()
  textResult?: string;

  @ApiProperty({ example: 'Agilent 1260 HPLC Sequence Run #4811; Peak Area = 12450.2', required: false })
  @IsString()
  @IsOptional()
  rawDataReference?: string;

  @ApiProperty({ example: 'Instrument ID used for analysis', required: false })
  @IsString()
  @IsOptional()
  instrumentId?: string;

  @ApiProperty({ example: 'Analysis performed per USP <621> monograph', required: false })
  @IsString()
  @IsOptional()
  comments?: string;
}
