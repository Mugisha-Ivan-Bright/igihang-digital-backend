import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from '../prisma/prisma.service.js';
export class AuthService {
  constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) { 
    console.log('--- DIAGNOSTIC START ---');
    console.log('The prisma object is:', this.prisma);
    console.log('--- DIAGNOSTIC END ---');
     }
  async create(createAuthDto: CreateAuthDto) {
    return this.prisma.user.create({
      data: createAuthDto,
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
