import { Inject, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
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
      fullName,
      nationalId,
      phoneNumber,
      role,
      locationId: providedLocationId,
      locationName,
      locationType
    } = createAuthDto;

    // Check if user already exists (email or nationalId)
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

    let finalLocationId = providedLocationId;

    // Handle location creation/lookup if ID not provided
    if (!finalLocationId && locationName && locationType) {
      const location = await this.prisma.location.upsert({
        where: { id: '00000000-0000-0000-0000-000000000000' }, // This is a dummy check because name is not unique in schema
        // Since name is not unique, we find by name and type first
        create: {
          name: locationName,
          type: locationType,
        },
        update: {},
      });

      // Correct approach for non-unique names:
      let existingLocation = await this.prisma.location.findFirst({
        where: { name: locationName, type: locationType }
      });

      if (!existingLocation) {
        existingLocation = await this.prisma.location.create({
          data: { name: locationName, type: locationType }
        });
      }
      finalLocationId = existingLocation.id;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        nationalId,
        phoneNumber,
        role,
        locationId: finalLocationId,
      },
    });

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
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

    // Payload includes role for RBAC
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
        fullName: user.fullName,
        role: user.role
      },
    };
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        location: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        location: true,
      },
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
