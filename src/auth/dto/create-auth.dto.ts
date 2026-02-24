import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length, MinLength } from 'class-validator';
import { UserRole, LocationType } from '@prisma/client';

export class CreateAuthDto {
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'Full name is required' })
    fullName: string;

    @IsString()
    @IsNotEmpty({ message: 'National ID is required' })
    @Length(16, 16, { message: 'National ID must be exactly 16 characters' })
    nationalId: string;

    @IsString()
    @IsNotEmpty({ message: 'Phone number is required' })
    phoneNumber: string;

    @IsEnum(UserRole, { message: 'Invalid user role' })
    role: UserRole;

    @IsOptional()
    @IsUUID('4', { message: 'Invalid location ID format' })
    locationId?: string;

    @IsOptional()
    @IsString()
    locationName?: string;

    @IsOptional()
    @IsEnum(LocationType, { message: 'Invalid location type' })
    locationType?: LocationType;
}
