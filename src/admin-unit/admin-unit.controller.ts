import { Controller, Get, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { AdminUnitService } from './admin-unit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AdminLevel } from '@prisma/client';

@Controller('admin-units')
@UseGuards(JwtAuthGuard, RolesGuard)
// Allow most roles to see administration units for registration/lookup purposes
@Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR, UserRole.MAYOR, UserRole.EXECUTIVE_SEC)
export class AdminUnitController {
    constructor(private readonly adminUnitService: AdminUnitService) { }

    @Get()
    findAll(
        @Query('level') level?: AdminLevel,
        @Query('parentId') parentId?: string,
    ) {
        return this.adminUnitService.findAll(level, parentId ? Number(parentId) : undefined);
    }

    @Get('unallocated')
    @Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR) // Keep unallocated stats for higher admins
    findUnallocated(@Query('level') level?: AdminLevel) {
        return this.adminUnitService.findUnallocated(level);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.adminUnitService.findOne(id);
    }
}
