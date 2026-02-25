import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateAuthDto {
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name: string;

    @IsString()
    @IsNotEmpty({ message: 'National ID is required' })
    @Length(16, 16, { message: 'National ID must be exactly 16 characters' })
    nationalId: string;

    @IsEnum(UserRole, { message: 'Invalid user role' })
    role: UserRole;

    @IsOptional()
    @IsNumber()
    adminUnitId?: number;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;
}
