import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SystemLogService } from './system-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SystemLogController {
    constructor(private readonly systemLogService: SystemLogService) { }

    @Get()
    async findAll(@Query('limit') limit?: number) {
        return this.systemLogService.findAll(limit ? Number(limit) : 100);
    }

    @Get('filter')
    async filter(
        @Query('table') table: string,
        @Query('recordId') recordId?: number,
    ) {
        return this.systemLogService.findByTable(table, recordId ? Number(recordId) : undefined);
    }

    @Get('count')
    async count() {
        return { count: await this.systemLogService.count() };
    }
}
