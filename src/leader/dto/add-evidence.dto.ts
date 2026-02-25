import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddEvidenceDto {
    @IsString()
    @IsNotEmpty()
    fileUrl: string;

    @IsString()
    @IsOptional()
    evidenceType?: string;

    @IsString()
    @IsOptional()
    description?: string;
}
