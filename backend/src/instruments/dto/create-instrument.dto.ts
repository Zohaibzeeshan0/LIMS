import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum InstrumentStatus {
  QUALIFIED = 'QUALIFIED',
  CALIBRATION_DUE = 'CALIBRATION_DUE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  MAINTENANCE = 'MAINTENANCE',
}

export class CreateInstrumentDto {
  @ApiProperty({ example: 'HPLC-01' })
  @IsString()
  @IsNotEmpty()
  equipmentCode: string;

  @ApiProperty({ example: 'Agilent 1260 Infinity II HPLC System' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1260 Infinity II quaternary LC' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 'DEBA402911' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty({ example: 'Agilent Technologies' })
  @IsString()
  @IsNotEmpty()
  manufacturer: string;

  @ApiProperty({ example: 'Instrumental Analysis Lab - Room 304' })
  @IsString()
  @IsNotEmpty()
  laboratoryRoom: string;

  @ApiProperty({ enum: InstrumentStatus, default: InstrumentStatus.QUALIFIED })
  @IsEnum(InstrumentStatus)
  @IsOptional()
  status?: InstrumentStatus;

  @ApiProperty({ example: 90, description: 'Calibration frequency in days' })
  @IsInt()
  @Min(1)
  @IsOptional()
  calibrationFrequencyDays?: number;

  @ApiProperty({ example: 'Equipped with DAD detector and thermostatted column compartment', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
