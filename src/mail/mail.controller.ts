import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mail')
export class MailController {
    constructor(private readonly mailService: MailService) { }

    @Post('send')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    async sendMail(@Body() dto: { to: string; subject: string; body: string; html?: boolean }) {
        return this.mailService.sendMail(dto.to, dto.subject, dto.body, dto.html);
    }

    @Get('logs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    async findAllLogs(@Query('limit') limit?: number) {
        return this.mailService.findAllLogs(limit ? Number(limit) : 100);
    }
}
