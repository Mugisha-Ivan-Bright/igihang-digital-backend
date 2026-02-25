import { Inject, Injectable, UnauthorizedException, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole, ActionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import { SystemLogService } from '../system-log/system-log.service';
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
          create: {
            latitude,
            longitude,
            adminUnitId,
          },
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

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role
    };

    // Log login
    await this.systemLogService.log(user.id, ActionType.LOGIN, 'User', user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
    };
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminUnitId: true,
        adminUnit: true,
        location: true,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminUnitId: true,
        adminUnit: true,
        location: true,
      },
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
          data: { latitude, longitude, adminUnitId: newAdminUnitId },
        });
      } else {
        await this.prisma.location.create({
          data: { latitude, longitude, adminUnitId: newAdminUnitId, userId: id },
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
    expires.setHours(expires.getHours() + 1);

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

    return { message: 'Password has been reset successfully' };
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
