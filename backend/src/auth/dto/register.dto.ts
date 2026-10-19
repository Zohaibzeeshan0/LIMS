import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../roles.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'ahmed.khan@citypharma.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Pass@12345' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Dr. Ahmed Khan' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'EMP-9042' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 'Quality Control' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ enum: Role, default: Role.QC_ANALYST })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
