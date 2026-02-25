import { Inject, Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRISMA_TOKEN') private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  async register(createAuthDto: CreateAuthDto) {
    const {
      email,
      password,
      name,
      nationalId,
      role,
      adminUnitId,
      latitude,
      longitude
    } = createAuthDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { nationalId }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('User with this email already exists');
      }
      if (existingUser.nationalId === nationalId) {
        throw new ConflictException('User with this National ID already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and unique location in a transaction
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          nationalId,
          role,
          adminUnitId,
        },
      });

      // Maintain requirement: each registered user should have a row in location database
      // If lat/long provided, use them. Otherwise, default to 0,0 (or handle as required)
      await tx.location.create({
        data: {
          latitude: latitude || 0,
          longitude: longitude || 0,
          adminUnitId,
          userId: user.id
        },
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginAuthDto: LoginAuthDto) {
    const user = await this.validateUser(loginAuthDto.email, loginAuthDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role
    };

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

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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
        adminUnit: true,
        location: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async remove(id: number) {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }
}
