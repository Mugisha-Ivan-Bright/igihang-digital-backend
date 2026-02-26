import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';
import { SystemLogService } from './system-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('System Logs')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class SystemLogController {
    constructor(private readonly systemLogService: SystemLogService) { }

    @Get()
    @ApiOperation({ summary: 'Get all system logs' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of logs to return', example: 100 })
    @ApiResponse({ status: 200, description: 'List of system logs' })
    async findAll(@Query('limit') limit?: number) {
        return this.systemLogService.findAll(limit ? Number(limit) : 100);
    }

    @Get('filter')
    @ApiOperation({ summary: 'Filter logs by table and record' })
    @ApiQuery({ name: 'table', required: true, description: 'Table name', example: 'User' })
    @ApiQuery({ name: 'recordId', required: false, description: 'Record ID', example: 1 })
    @ApiResponse({ status: 200, description: 'Filtered system logs' })
    async filter(
        @Query('table') table: string,
        @Query('recordId') recordId?: number,
    ) {
        return this.systemLogService.findByTable(table, recordId ? Number(recordId) : undefined);
    }

    @Get('count')
    @ApiOperation({ summary: 'Get total log count' })
    @ApiResponse({ status: 200, description: 'Total number of logs' })
    async count() {
        return { count: await this.systemLogService.count() };
    }
}
