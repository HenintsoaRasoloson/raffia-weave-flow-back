import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { getAuthConfig } from './auth.config';
import { AuthSession, JwtAccessPayload, PublicUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

type AuthUserRecord = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  passwordHash: string;
  refreshTokenHash: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  private readonly authConfig = getAuthConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException('Email already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = (await this.prisma.user.create({
      data: {
        email,
        name: dto.name?.trim() || null,
          isAdmin: false,
        passwordHash,
      },
    })) as AuthUserRecord;

    return this.createSession(user);
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const email = this.normalizeEmail(dto.email);
    const user = (await this.prisma.user.findUnique({
      where: { email },
    })) as AuthUserRecord | null;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.assertNotLocked(user);

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.resetLoginState(user.id);

    return this.createSession(user);
  }

  async refresh(dto: RefreshDto): Promise<AuthSession> {
    let payload: JwtAccessPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtAccessPayload>(
        dto.refreshToken,
        {
          secret: this.authConfig.refreshTokenSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = (await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })) as AuthUserRecord | null;

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const refreshTokenMatches = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return this.createSession(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });

    return { message: 'Logged out.' };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return this.toPublicUser(user as AuthUserRecord);
  }

  private async createSession(user: AuthUserRecord): Promise<AuthSession> {
    const payload = this.buildPayload(user);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.authConfig.accessTokenSecret,
        expiresIn: this.authConfig.accessTokenTtl,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.authConfig.refreshTokenSecret,
        expiresIn: this.authConfig.refreshTokenTtl,
      }),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.authConfig.accessTokenTtl,
    };
  }

  private buildPayload(user: AuthUserRecord): JwtAccessPayload {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private toPublicUser(user: AuthUserRecord): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async assertNotLocked(user: AuthUserRecord) {
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new ForbiddenException('Account temporarily locked.');
    }
  }

  private async registerFailedAttempt(user: AuthUserRecord) {
    const nextAttemptCount = user.failedLoginAttempts + 1;

    if (nextAttemptCount >= this.authConfig.maxFailedAttempts) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + this.authConfig.lockMinutes * 60_000),
        },
      });

      throw new ForbiddenException('Account temporarily locked.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: nextAttemptCount,
      },
    });
  }

  private resetLoginState(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}