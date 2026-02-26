import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { LocationMgmtService } from './location-mgmt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Geospatial/Locations')
@Controller('mgmt/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class LocationMgmtController {
    constructor(private readonly locationMgmtService: LocationMgmtService) { }

    @Get()
    @ApiOperation({ summary: 'Get all locations' })
    @ApiResponse({ status: 200, description: 'List of all locations with GPS coordinates' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    findAll() {
        return this.locationMgmtService.findAll();
    }
}
