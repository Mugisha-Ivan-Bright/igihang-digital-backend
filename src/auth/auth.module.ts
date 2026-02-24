import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
// ❌ DO NOT import PrismaService here
// ❌ DO NOT put PrismaService in providers here

@Module({
  // PrismaModule is Global, so we don't even need it in 'imports' 
  // but adding it here is safer if you remove @Global() later
  imports: [], 
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}  