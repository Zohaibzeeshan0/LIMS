import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOosDto {
  @ApiProperty({ example: 'CONCLUDED', required: false })
  @IsString()
  @IsOptional()
  phaseOneStatus?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  labErrorConfirmed?: boolean;

  @ApiProperty({ example: 'RAW_MATERIAL_IMPURITY', required: false })
  @IsString()
  @IsOptional()
  rootCauseCategory?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  phaseTwoRequired?: boolean;

  @ApiProperty({ example: 'Root cause verified as slight raw material variation in Lot #448. Vendor notification sent and tighter IPC implemented.', required: false })
  @IsString()
  @IsOptional()
  capaDescription?: string;

  @ApiProperty({ example: 'APPROVED', required: false })
  @IsString()
  @IsOptional()
  qaApprovalStatus?: string;
}
