import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SendMailDto } from './dto/send-mail.dto';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
    constructor(private readonly mailService: MailService) { }

    @Post('send')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiCookieAuth('access_token')
    @ApiOperation({ summary: 'Send email (Admin only)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                to: { type: 'string', example: 'recipient@example.com' },
                subject: { type: 'string', example: 'Test Email' },
                body: { type: 'string', example: 'Hello from Igihango!' },
                html: { type: 'boolean', example: false }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Email sent successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async sendMail(@Body() dto: { to: string; subject: string; body: string; html?: boolean }) {
        return this.mailService.sendMail(dto.to, dto.subject, dto.body, dto.html);
    }

    @Get('logs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiCookieAuth('access_token')
    @ApiOperation({ summary: 'Get email logs (Admin only)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of logs to return', example: 100 })
    @ApiResponse({ status: 200, description: 'List of email logs' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async findAllLogs(@Query('limit') limit?: number) {
        return this.mailService.findAllLogs(limit ? Number(limit) : 100);
    }
}
