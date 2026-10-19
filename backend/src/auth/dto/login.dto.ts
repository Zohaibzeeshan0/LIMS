import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@citypharma.com',
    description: 'Corporate email address or Employee ID (e.g. EMP-001)',
  })
  @IsString({ message: 'Email or Employee ID must be a string' })
  @IsNotEmpty({ message: 'Email or Employee ID is required' })
  email: string;

  @ApiProperty({ example: 'Admin@1234', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
