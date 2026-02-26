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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LeaderService } from './leader.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { TaskStatus } from '@prisma/client';

@ApiTags('Leader Operations')
@Controller('leader')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class LeaderController {
    constructor(private readonly leaderService: LeaderService) { }

    @Get('subordinates')
    @ApiOperation({ summary: 'Get subordinate leaders' })
    @ApiResponse({ status: 200, description: 'List of subordinate leaders' })
    getSubordinates(@Request() req) {
        return this.leaderService.getSubordinates(req.user.userId);
    }

    @Get('superiors')
    @ApiOperation({ summary: 'Get superior leaders' })
    @ApiResponse({ status: 200, description: 'List of superior leaders' })
    getSuperiors(@Request() req) {
        return this.leaderService.getSuperiors(req.user.userId);
    }

    @Get('tree')
    @ApiOperation({ summary: 'Get full leadership tree' })
    @ApiResponse({ status: 200, description: 'Nested leadership hierarchy' })
    getLeadershipTree(@Request() req) {
        return this.leaderService.getLeadershipTree(req.user.userId);
    }

    @Get('tasks/mine')
    @ApiOperation({ summary: 'Get my assigned tasks' })
    @ApiResponse({ status: 200, description: 'List of tasks assigned to me' })
    getMyTasks(@Request() req) {
        return this.leaderService.getMyTasks(req.user.userId);
    }

    @Get('tasks/unit')
    @ApiOperation({ summary: 'Get all tasks in my unit' })
    @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
    @ApiResponse({ status: 200, description: 'List of unit tasks' })
    getUnitTasks(@Request() req, @Query('status') status?: TaskStatus) {
        return this.leaderService.getUnitTasks(req.user.userId, status);
    }

    @Post('tasks')
    @ApiOperation({ summary: 'Assign a new task' })
    @ApiResponse({ status: 201, description: 'Task assigned successfully' })
    assignTask(@Body() dto: AssignTaskDto, @Request() req) {
        return this.leaderService.assignTask(dto, req.user.userId);
    }

    @Patch('tasks/:id/status')
    @ApiOperation({ summary: 'Update task status' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 200, description: 'Task status updated' })
    updateTaskStatus(
        @Param('id', ParseIntPipe) taskId: number,
        @Body() dto: UpdateTaskStatusDto,
        @Request() req,
    ) {
        return this.leaderService.updateTaskStatus(taskId, dto.status, req.user.userId);
    }

    @Post('tasks/:id/evidence')
    @ApiOperation({ summary: 'Add evidence to task' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 201, description: 'Evidence added' })
    addEvidence(
        @Param('id', ParseIntPipe) taskId: number,
        @Body() dto: AddEvidenceDto,
        @Request() req,
    ) {
        return this.leaderService.addEvidence(taskId, dto, req.user.userId);
    }

    @Get('tasks/:id/evidence')
    @ApiOperation({ summary: 'Get task evidence' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 200, description: 'List of evidence' })
    getTaskEvidence(@Param('id', ParseIntPipe) taskId: number) {
        return this.leaderService.getTaskEvidence(taskId);
    }

    @Post('tasks/:id/comments')
    @ApiOperation({ summary: 'Add comment to task' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 201, description: 'Comment added' })
    addComment(
        @Param('id', ParseIntPipe) taskId: number,
        @Body() dto: AddCommentDto,
        @Request() req,
    ) {
        return this.leaderService.addComment(taskId, dto, req.user.userId);
    }

    @Get('tasks/:id/comments')
    @ApiOperation({ summary: 'Get task comments' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 200, description: 'List of comments' })
    getTaskComments(@Param('id', ParseIntPipe) taskId: number) {
        return this.leaderService.getTaskComments(taskId);
    }

    @Get('progress')
    @ApiOperation({ summary: 'Get my progress statistics' })
    @ApiResponse({ status: 200, description: 'Progress statistics' })
    getProgress(@Request() req) {
        return this.leaderService.getProgress(req.user.userId);
    }

    @Get('progress/:adminUnitId')
    @ApiOperation({ summary: 'Get progress for specific unit' })
    @ApiParam({ name: 'adminUnitId', description: 'Admin Unit ID' })
    @ApiResponse({ status: 200, description: 'Unit progress statistics' })
    getProgressForUnit(
        @Param('adminUnitId', ParseIntPipe) adminUnitId: number,
        @Request() req,
    ) {
        return this.leaderService.getProgress(req.user.userId, adminUnitId);
    }
}
