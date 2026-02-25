import { Controller, Get, UseGuards } from '@nestjs/common';
import { LocationMgmtService } from './location-mgmt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mgmt/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR)
export class LocationMgmtController {
    constructor(private readonly locationMgmtService: LocationMgmtService) { }

    @Get()
    findAll() {
        return this.locationMgmtService.findAll();
    }
}
