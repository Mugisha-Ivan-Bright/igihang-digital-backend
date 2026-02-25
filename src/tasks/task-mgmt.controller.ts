import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TaskMgmtService } from './task-mgmt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mgmt/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GOVERNOR)
export class TaskMgmtController {
    constructor(private readonly taskMgmtService: TaskMgmtService) { }

    @Get()
    findAll(@Query('status') status?: string) {
        return this.taskMgmtService.findAll(status);
    }

    @Get('evidence')
    findEvidence() {
        return this.taskMgmtService.findEvidence();
    }

    @Get('comments')
    findComments() {
        return this.taskMgmtService.findComments();
    }
}
