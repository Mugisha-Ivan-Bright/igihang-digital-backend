import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateAuthDto {
    @ApiProperty({ example: 'admin@gov.rw', description: 'User email address' })
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @ApiProperty({ example: 'Password123!', description: 'User password (min 6 characters)' })
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @ApiProperty({ example: 'Super Admin', description: 'Full name of the user' })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name: string;

    @ApiProperty({ example: '1111222233334444', description: 'National ID (16 digits)' })
    @IsString()
    @IsNotEmpty({ message: 'National ID is required' })
    @Length(16, 16, { message: 'National ID must be exactly 16 characters' })
    nationalId: string;

    @ApiProperty({ enum: UserRole, example: 'SUPER_ADMIN', description: 'User role' })
    @IsEnum(UserRole, { message: 'Invalid user role' })
    role: UserRole;

    @ApiPropertyOptional({ example: 1, description: 'Administrative unit ID' })
    @IsOptional()
    @IsNumber()
    adminUnitId?: number;

    @ApiPropertyOptional({ example: -1.9441, description: 'Latitude coordinate' })
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional({ example: 30.0619, description: 'Longitude coordinate' })
    @IsOptional()
    @IsNumber()
    longitude?: number;
}
