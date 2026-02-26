import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTaskDto {
    @ApiProperty({ example: 'Construct community hall', description: 'Task title' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ example: 'Build a new community hall in Sector X', description: 'Task description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 2, description: 'ID of the user to assign the task to' })
    @IsNumber()
    assigneeId: number;

    @ApiProperty({ example: 3, description: 'Administrative unit ID where task will be performed' })
    @IsNumber()
    unitId: number;

    @ApiProperty({ example: '2026-06-30T00:00:00Z', description: 'Task deadline (ISO 8601 format)' })
    @IsDateString()
    deadline: string;
}
