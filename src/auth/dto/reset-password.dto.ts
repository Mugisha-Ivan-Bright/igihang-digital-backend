import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ example: 'ACTUAL_TOKEN_FROM_EMAIL', description: 'Password reset token from email' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: 'NewSecurePassword123!', description: 'New password (min 6 characters)' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}
