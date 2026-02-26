import { Controller, Get, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdminUnitService } from './admin-unit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AdminLevel } from '@prisma/client';

@ApiTags('Administrative Units')
@Controller('admin-units')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR, UserRole.MAYOR, UserRole.EXECUTIVE_SEC)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class AdminUnitController {
    constructor(private readonly adminUnitService: AdminUnitService) { }

    @Get()
    @ApiOperation({ summary: 'Get all administrative units' })
    @ApiQuery({ name: 'level', required: false, enum: AdminLevel })
    @ApiQuery({ name: 'parentId', required: false, description: 'Parent unit ID' })
    @ApiResponse({ status: 200, description: 'List of administrative units' })
    findAll(
        @Query('level') level?: AdminLevel,
        @Query('parentId') parentId?: string,
    ) {
        return this.adminUnitService.findAll(level, parentId ? Number(parentId) : undefined);
    }

    @Get('unallocated')
    @Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR)
    @ApiOperation({ summary: 'Get unallocated administrative units' })
    @ApiQuery({ name: 'level', required: false, enum: AdminLevel })
    @ApiResponse({ status: 200, description: 'List of unallocated units' })
    findUnallocated(@Query('level') level?: AdminLevel) {
        return this.adminUnitService.findUnallocated(level);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get administrative unit by ID' })
    @ApiParam({ name: 'id', description: 'Admin Unit ID' })
    @ApiResponse({ status: 200, description: 'Administrative unit details' })
    @ApiResponse({ status: 404, description: 'Unit not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.adminUnitService.findOne(id);
    }
}
