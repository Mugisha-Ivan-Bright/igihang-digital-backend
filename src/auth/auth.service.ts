import { Inject, Injectable, UnauthorizedException, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole, ActionType, NotificationType, User, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import { SystemLogService } from '../system-log/system-log.service';
import { NotificationService } from '../notifications/notification.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly LEADERSHIP_ROLES: UserRole[] = [
    UserRole.GOVERNOR,
    UserRole.MAYOR,
    UserRole.EXECUTIVE_SEC,
    UserRole.VILLAGE_CHIEF,
  ];

  constructor(
    @Inject('PRISMA_TOKEN') private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly systemLogService: SystemLogService,
    private readonly notificationService: NotificationService,
  ) { }

  async register(dto: CreateAuthDto, actorId?: number) {
    const {
      email,
      password,
      name,
      role,
      nationalId,
      adminUnitId,
      latitude,
      longitude,
    } = dto;

    // Check if user already exists
    const userExists = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { nationalId }],
      },
    });

    if (userExists) {
      throw new ConflictException('User with this email or national ID already exists');
    }

    // Validate administrative unit existence
    if (adminUnitId) {
      await this.validateAdminUnit(adminUnitId);
    }

    // Verify leadership uniqueness
    if (this.LEADERSHIP_ROLES.includes(role)) {
      if (!adminUnitId) {
        throw new ConflictException(`Role ${role} requires an administrative unit.`);
      }
      await this.verifyLeadershipUniqueness(role, adminUnitId);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        role,
        nationalId,
        adminUnitId,
        location: latitude && longitude ? {
          create: [{
            latitude: new Prisma.Decimal(latitude),
            longitude: new Prisma.Decimal(longitude),
            adminUnitId,
          }],
        } : undefined,
      },
    });

    // Log the creation - if no actorId (self-registration), use the new user's id
    const finalActorId = actorId || user.id;
    await this.systemLogService.log(finalActorId, ActionType.CREATE, 'User', user.id, null, { email, role });

    return this.login({ email, password });
  }

  private async validateAdminUnit(adminUnitId: number) {
    const unit = await this.prisma.adminUnit.findUnique({
      where: { id: adminUnitId },
    });

    if (!unit) {
      throw new BadRequestException(`Administrative Unit with ID ${adminUnitId} does not exist.`);
    }
  }

  async verifyLeadershipUniqueness(role: UserRole, adminUnitId: number, exceptUserId?: number) {
    const existingLeader = await this.prisma.user.findFirst({
      where: {
        role,
        adminUnitId,
        NOT: exceptUserId ? { id: exceptUserId } : undefined,
      },
    });

    if (existingLeader) {
      throw new ConflictException(
        `A ${role} already exists for this administrative unit.`,
      );
    }
  }

  async login(loginDto: LoginAuthDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    // Log login
    await this.systemLogService.log(user.id, ActionType.LOGIN, 'User', user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
    };
  }

  async getTokens(userId: number, email: string, role: UserRole) {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'SECRET_KEY',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'REFRESH_SECRET_KEY',
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashedToken,
        refreshTokenExpires: expires,
      },
    });
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken || !user.refreshTokenExpires) {
      throw new ForbiddenException('Access Denied');
    }

    if (new Date() > user.refreshTokenExpires) {
      throw new ForbiddenException('Refresh token expired');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async findAll() {
    return this.prisma.user.findMany({
      omit: { passwordHash: true, refreshToken: true, refreshTokenExpires: true },
      include: { adminUnit: true, location: true },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true, refreshToken: true, refreshTokenExpires: true },
      include: { adminUnit: true, location: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: number, updateAuthDto: UpdateAuthDto, actorId: number) {
    const { password, latitude, longitude, adminUnitId, role, ...rest } = updateAuthDto;

    // Check if user exists
    const existingUser = await this.findOne(id);

    // Validate administrative unit existence if being changed
    if (adminUnitId !== undefined && adminUnitId !== null) {
      await this.validateAdminUnit(adminUnitId);
    }

    // If role or adminUnitId is changing, verify uniqueness if it's a leadership position
    const newRole = role || existingUser.role;
    const newAdminUnitId = adminUnitId !== undefined ? adminUnitId : existingUser.adminUnitId;

    if (this.LEADERSHIP_ROLES.includes(newRole)) {
      if (!newAdminUnitId) {
        throw new ConflictException(`Role ${newRole} requires an administrative unit.`);
      }
      if (role || adminUnitId !== undefined) {
        await this.verifyLeadershipUniqueness(newRole, newAdminUnitId, id);
      }
    }

    const data: any = { ...rest };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    if (role) data.role = role;
    if (adminUnitId !== undefined) data.adminUnitId = adminUnitId;

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    // Update location if provided
    if (latitude !== undefined && longitude !== undefined) {
      const existingLocation = await this.prisma.location.findFirst({
        where: { userId: id },
      });

      if (existingLocation) {
        await this.prisma.location.update({
          where: { id: existingLocation.id },
          data: {
            latitude: new Prisma.Decimal(latitude),
            longitude: new Prisma.Decimal(longitude),
            adminUnitId: newAdminUnitId
          },
        });
      } else {
        await this.prisma.location.create({
          data: {
            latitude: new Prisma.Decimal(latitude),
            longitude: new Prisma.Decimal(longitude),
            adminUnitId: newAdminUnitId,
            userId: id,
          },
        });
      }
    }

    // Log update
    await this.systemLogService.log(actorId, ActionType.UPDATE, 'User', id, existingUser, user);

    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    });

    await this.systemLogService.log(user.id, ActionType.UPDATE, 'User', user.id, null, { action: 'forgot_password' });
    await this.mailService.sendPasswordResetEmail(user.email, token);

    return { message: 'Password reset email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    await this.systemLogService.log(user.id, ActionType.UPDATE, 'User', user.id, null, { action: 'reset_password' });

    // Notify user about password change
    await this.notificationService.create({
      recipientId: user.id,
      type: NotificationType.SECURITY_ALERT,
      title: 'Password Changed Successfully',
      message: 'Your account password was recently reset. If you did not perform this action, please contact support immediately.',
    });

    return { message: 'Password has been reset successfully' };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpires: null,
      },
    });
    await this.systemLogService.log(userId, ActionType.LOGOUT, 'User', userId);
    return { message: 'Logged out successfully' };
  }

  async remove(id: number, actorId: number) {
    if (id === actorId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    // 1. Verify user exists first
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 2. Log deletion BEFORE deleting (so actorId is valid)
    await this.systemLogService.log(actorId, ActionType.DELETE, 'User', id, user, null);

    // 3. Delete user (SystemLog entries will cascade if schema push was successful)
    return await this.prisma.user.delete({
      where: { id },
    });
  }
}
