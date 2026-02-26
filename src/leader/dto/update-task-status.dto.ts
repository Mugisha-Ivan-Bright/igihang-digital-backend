import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskStatusDto {
    @ApiProperty({ enum: TaskStatus, example: 'IN_PROGRESS', description: 'New task status' })
    @IsEnum(TaskStatus)
    status: TaskStatus;
}
