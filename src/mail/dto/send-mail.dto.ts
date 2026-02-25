import { IsEmail, IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class SendMailDto {
    @IsEmail()
    @IsNotEmpty()
    to: string;

    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    body: string;

    @IsOptional()
    @IsBoolean()
    html?: boolean;
}
