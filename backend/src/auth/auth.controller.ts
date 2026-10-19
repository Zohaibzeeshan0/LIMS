import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Response as ResDecorator,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthThrottlerGuard } from '../common/guards/auth-throttler.guard';
import { setAuthCookies, clearAuthCookies } from '../common/utils/cookie-config';
import { Role } from '@prisma/client';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthThrottlerGuard)
  @ApiOperation({ summary: 'Authenticate user & issue access and refresh tokens (Rate-limited)' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded: Workstation temporarily throttled' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @ResDecorator({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, ip);

    // Reset rate limiter on successful credential presentation
    AuthThrottlerGuard.resetLimit(ip);

    // Configure secure HttpOnly cookies for additional browser security
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthThrottlerGuard)
  @ApiOperation({ summary: 'Rotate refresh token and issue new short-lived access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded: Workstation temporarily throttled' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ip: string,
    @ResDecorator({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshTokens(refreshTokenDto.refreshToken, ip);

    // Configure rotated secure HttpOnly cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active refresh token and log out user with audit trail' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async logout(
    @Request() req: any,
    @Ip() ip: string,
    @ResDecorator({ passthrough: true }) res: Response,
  ) {
    // Clear cookies securely
    clearAuthCookies(res);
    return this.authService.logout(req.user?.id, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve currently logged in employee profile' })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved' })
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new laboratory employee (Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  async register(@Body() registerDto: RegisterDto, @Request() req: any) {
    return this.authService.register(registerDto, req.user?.id);
  }
}
