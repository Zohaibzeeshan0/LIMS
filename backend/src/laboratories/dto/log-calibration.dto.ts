import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogCalibrationDto {
  @ApiProperty({ example: 'CAL-2026-0491' })
  @IsString()
  @IsNotEmpty()
  certificateNumber: string;

  @ApiProperty({ example: 'NIST Traceable Reference Standards Set #S-9912', required: false })
  @IsString()
  @IsOptional()
  standardUsed?: string;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  passed?: boolean;

  @ApiProperty({ example: 'Flow rate accuracy, wavelength accuracy within ±1nm, detector noise < 0.01 mAU', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
