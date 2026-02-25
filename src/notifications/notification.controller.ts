import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    findMyNotifications(@Request() req) {
        return this.notificationService.findForUser(req.user.userId);
    }

    @Get('all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    findAll(@Query('limit') limit?: number) {
        return this.notificationService.findAll(limit ? Number(limit) : 100);
    }

    @Patch(':id/read')
    markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return this.notificationService.markAsRead(id, req.user.userId);
    }

    @Patch('read-all')
    markAllRead(@Request() req) {
        return this.notificationService.markAllAsRead(req.user.userId);
    }
}
