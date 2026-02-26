import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginAuthDto {
    @ApiProperty({ example: 'admin@gov.rw', description: 'User email address' })
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @ApiProperty({ example: 'Password123!', description: 'User password' })
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}
