import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class AssignTaskDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    assigneeId: number;

    @IsNumber()
    unitId: number;

    @IsDateString()
    deadline: string;
}
