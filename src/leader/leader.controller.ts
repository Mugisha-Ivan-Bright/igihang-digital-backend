import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import { LeaderService } from './leader.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { TaskStatus } from '@prisma/client';

@Controller('leader')
@UseGuards(JwtAuthGuard)
export class LeaderController {
    constructor(private readonly leaderService: LeaderService) { }

    // ─── Hierarchy ─────────────────────────────────────────────────────────────

    /** Returns leaders directly below the logged-in leader */
    @Get('subordinates')
    getSubordinates(@Request() req) {
        return this.leaderService.getSubordinates(req.user.userId);
    }

    /** Returns leaders directly above the logged-in leader */
    @Get('superiors')
    getSuperiors(@Request() req) {
        return this.leaderService.getSuperiors(req.user.userId);
    }

    /**
     * Full nested JSON tree of all leaders below the caller,
     * down to VILLAGE_CHIEF, with complete user + task info.
     */
    @Get('tree')
    getLeadershipTree(@Request() req) {
        return this.leaderService.getLeadershipTree(req.user.userId);
    }

    // ─── Tasks ─────────────────────────────────────────────────────────────────

    /** Tasks assigned to the logged-in leader */
    @Get('tasks/mine')
    getMyTasks(@Request() req) {
        return this.leaderService.getMyTasks(req.user.userId);
    }

    /** All tasks in the leader's admin unit scope (incl. child units) */
    @Get('tasks/unit')
    getUnitTasks(@Request() req, @Query('status') status?: TaskStatus) {
        return this.leaderService.getUnitTasks(req.user.userId, status);
    }

    /** Assign a new task to a subordinate */
    @Post('tasks')
    assignTask(@Body() dto: AssignTaskDto, @Request() req) {
        return this.leaderService.assignTask(dto, req.user.userId);
    }

    /** Update the status of a task (assignee or issuer only) */
    @Patch('tasks/:id/status')
    updateTaskStatus(
        @Param('id', ParseIntPipe) taskId: number,
        @Body() dto: UpdateTaskStatusDto,
        @Request() req,
    ) {
        return this.leaderService.updateTaskStatus(taskId, dto.status, req.user.userId);
    }

    // ─── Evidence ──────────────────────────────────────────────────────────────

    @Post('tasks/:id/evidence')
    addEvidence(
        @Param('id', ParseIntPipe) taskId: number,
        @Body() dto: AddEvidenceDto,
        @Request() req,
    ) {
        return this.leaderService.addEvidence(taskId, dto, req.user.userId);
    }

    @Get('tasks/:id/evidence')
    getTaskEvidence(@Param('id', ParseIntPipe) taskId: number) {
        return this.leaderService.getTaskEvidence(taskId);
    }

    // ─── Comments ──────────────────────────────────────────────────────────────

    @Post('tasks/:id/comments')
    addComment(
        @Param('id', ParseIntPipe) taskId: number,
        @Body() dto: AddCommentDto,
        @Request() req,
    ) {
        return this.leaderService.addComment(taskId, dto, req.user.userId);
    }

    @Get('tasks/:id/comments')
    getTaskComments(@Param('id', ParseIntPipe) taskId: number) {
        return this.leaderService.getTaskComments(taskId);
    }

    // ─── Progress ──────────────────────────────────────────────────────────────

    /** Progress for the logged-in leader's own scope */
    @Get('progress')
    getProgress(@Request() req) {
        return this.leaderService.getProgress(req.user.userId);
    }

    /** Progress for any specific admin unit (cross-scope view) */
    @Get('progress/:adminUnitId')
    getProgressForUnit(
        @Param('adminUnitId', ParseIntPipe) adminUnitId: number,
        @Request() req,
    ) {
        return this.leaderService.getProgress(req.user.userId, adminUnitId);
    }
}
