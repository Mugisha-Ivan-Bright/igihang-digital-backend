import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('health')
    getHealth() {
        return this.dashboardService.getHealth();
    }

    @Get('stats')
    getSystemStats() {
        return this.dashboardService.getSystemStats();
    }

    @Get('active-users')
    getActiveUsers(@Query('limit') limit?: number) {
        return this.dashboardService.getActiveUsers(limit ? Number(limit) : 10);
    }
}
