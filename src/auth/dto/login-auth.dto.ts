import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginAuthDto {
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}
