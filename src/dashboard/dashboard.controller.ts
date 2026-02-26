import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('health')
    @ApiOperation({ summary: 'Get system health status' })
    @ApiResponse({ status: 200, description: 'System health information' })
    getHealth() {
        return this.dashboardService.getHealth();
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get system statistics' })
    @ApiResponse({ status: 200, description: 'System statistics' })
    getSystemStats() {
        return this.dashboardService.getSystemStats();
    }

    @Get('active-users')
    @ApiOperation({ summary: 'Get active users' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of users to return' })
    @ApiResponse({ status: 200, description: 'List of active users' })
    getActiveUsers(@Query('limit') limit?: number) {
        return this.dashboardService.getActiveUsers(limit ? Number(limit) : 10);
    }
}
