import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({ example: 'admin@gov.rw', description: 'Email address for password reset' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
