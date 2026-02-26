import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { TaskSchedulerService } from './task-scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Task Scheduler')
@Controller('tasks/scheduler')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class TaskSchedulerController {
    constructor(private readonly taskSchedulerService: TaskSchedulerService) { }

    @Post('check-overdue')
    @ApiOperation({
        summary: 'Manually trigger overdue tasks check (Admin only)',
        description: 'Checks all tasks and updates status to OVERDUE if deadline has passed. Sends notifications to assignees and issuers.'
    })
    @ApiResponse({ status: 200, description: 'Overdue check completed successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async triggerOverdueCheck() {
        await this.taskSchedulerService.manualOverdueCheck();
        return {
            success: true,
            message: 'Overdue tasks check completed',
            timestamp: new Date().toISOString(),
        };
    }

    @Post('send-reminders')
    @ApiOperation({
        summary: 'Manually trigger deadline reminders (Admin only)',
        description: 'Sends reminder notifications for tasks due within 3 days to assignees and issuers.'
    })
    @ApiResponse({ status: 200, description: 'Deadline reminders sent successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async triggerDeadlineReminders() {
        await this.taskSchedulerService.manualDeadlineReminders();
        return {
            success: true,
            message: 'Deadline reminders sent',
            timestamp: new Date().toISOString(),
        };
    }
}
