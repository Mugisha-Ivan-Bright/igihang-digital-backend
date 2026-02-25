import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, HttpCode, ParseIntPipe, Request, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  register(@Body() createAuthDto: CreateAuthDto, @Request() req) {
    const actorId = req.user?.userId; // Optional actor if registered by admin
    return this.authService.register(createAuthDto, actorId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginAuthDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // Set cookies
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR)
  findAll() {
    return this.authService.findAll();
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.authService.findOne(id);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAuthDto: UpdateAuthDto, @Request() req) {
    return this.authService.update(id, updateAuthDto, req.user.userId);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.authService.remove(id, req.user.userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return this.authService.logout(req.user.userId);
  }

  @Post('refresh')
  async refresh(@Request() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    // Extract user info from token (we need userId)
    // For simplicity, we can decode it here or use a specific guard
    // In a real app, you'd use a RefreshTokenGuard
    try {
      const result = await this.authService.refreshTokens(req.user.userId, refreshToken);
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });
      return result;
    } catch (e) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      throw e;
    }
  }
}
