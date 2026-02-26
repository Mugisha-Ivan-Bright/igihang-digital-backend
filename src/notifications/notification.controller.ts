import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get my notifications' })
    @ApiResponse({ status: 200, description: 'List of user notifications' })
    findMyNotifications(@Request() req) {
        return this.notificationService.findForUser(req.user.userId);
    }

    @Get('all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all notifications (Admin only)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of notifications to return', example: 100 })
    @ApiResponse({ status: 200, description: 'List of all notifications' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll(@Query('limit') limit?: number) {
        return this.notificationService.findAll(limit ? Number(limit) : 100);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiParam({ name: 'id', description: 'Notification ID', example: 1 })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return this.notificationService.markAsRead(id, req.user.userId);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'All notifications marked as read' })
    markAllRead(@Request() req) {
        return this.notificationService.markAllAsRead(req.user.userId);
    }
}
