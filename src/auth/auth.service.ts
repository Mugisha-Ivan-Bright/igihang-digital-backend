import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { Prisma } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {    }
  async create(createAuthDto: CreateAuthDto) {
    const salt = await bcrypt.genSalt();  
    const hashedPassword = await bcrypt.hash(createAuthDto.password, salt);

    return this.prisma.user.create({
      data: {
        email: createAuthDto.email,
        password: hashedPassword,
      },
      select : {
        id: true,
        email: true,
      }
    });
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
