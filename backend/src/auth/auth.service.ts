import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const cleanId = (identifier || '').trim();
    if (!cleanId) return null;

    // Support both corporate email and Employee ID (e.g. EMP-001)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId.toLowerCase() },
          { employeeId: cleanId.toUpperCase() },
        ],
      },
    });

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, hashedRefreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto, ipAddress?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email, employee ID, or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Account is inactive. Please contact the City Pharma QA Administrator.',
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessTokenExpires = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshTokenExpires = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '7d';

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpires,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTokenExpires,
    });

    // Hash refresh token for storage
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

    // Update user with last login time and active hashed refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        hashedRefreshToken,
      },
    });

    // 21 CFR Part 11 Audit Trail for Login
    await this.prisma.auditTrail.create({
      data: {
        entityName: 'User',
        entityId: user.id,
        action: 'USER_LOGIN',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        ipAddress: ipAddress || '127.0.0.1',
        reasonForChange: 'Authentication credential verification (Access granted)',
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpires,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        employeeId: user.employeeId,
        department: user.department,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string, ipAddress?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account no longer active');
    }

    // Reuse detection: If no hashed token is saved, token was revoked
    if (!user.hashedRefreshToken) {
      throw new UnauthorizedException('Session terminated or token revoked. Please log in again.');
    }

    // Verify token against hash
    const isTokenMatching = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isTokenMatching) {
      // Possible token reuse attack detected! Revoke active session immediately
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      });

      await this.prisma.auditTrail.create({
        data: {
          entityName: 'User',
          entityId: userId,
          action: 'SECURITY_ALERT',
          performedById: userId,
          performedByName: user.fullName,
          role: user.role,
          ipAddress: ipAddress || '127.0.0.1',
          reasonForChange: 'Compromised refresh token reuse detected. Active session invalidated.',
        },
      });

      throw new UnauthorizedException(
        'Security alert: Invalid token presentation. Active sessions invalidated.',
      );
    }

    // Refresh Token Rotation: Issue brand new pair of tokens
    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const accessTokenExpires = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshTokenExpires = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '7d';

    const newAccessToken = this.jwtService.sign(newPayload, {
      expiresIn: accessTokenExpires,
    });
    const newRefreshToken = this.jwtService.sign(newPayload, {
      expiresIn: refreshTokenExpires,
    });

    const salt = await bcrypt.genSalt(10);
    const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hashedRefreshToken: newHashedRefreshToken,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: accessTokenExpires,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        employeeId: user.employeeId,
        department: user.department,
        role: user.role,
      },
    };
  }

  async logout(userId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      });

      // 21 CFR Part 11 Audit Trail for Logout
      await this.prisma.auditTrail.create({
        data: {
          entityName: 'User',
          entityId: userId,
          action: 'USER_LOGOUT',
          performedById: userId,
          performedByName: user.fullName,
          role: user.role,
          ipAddress: ipAddress || '127.0.0.1',
          reasonForChange: 'User initiated secure session termination',
        },
      });
    }

    return {
      success: true,
      message: 'Successfully logged out and session revoked',
      timestamp: new Date().toISOString(),
    };
  }

  async register(registerDto: RegisterDto, adminUserId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: registerDto.email.toLowerCase() },
          { employeeId: registerDto.employeeId.toUpperCase() },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('User with this email or employee ID already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        passwordHash,
        fullName: registerDto.fullName,
        employeeId: registerDto.employeeId.toUpperCase(),
        department: registerDto.department,
        role: registerDto.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        employeeId: true,
        department: true,
        role: true,
        createdAt: true,
      },
    });

    await this.prisma.auditTrail.create({
      data: {
        entityName: 'User',
        entityId: newUser.id,
        action: 'USER_REGISTERED',
        performedById: adminUserId || newUser.id,
        performedByName: registerDto.fullName,
        role: newUser.role,
        reasonForChange: 'Account provisioned in LIMS directory',
      },
    });

    return newUser;
  }
}
