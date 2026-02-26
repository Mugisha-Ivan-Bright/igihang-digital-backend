import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddEvidenceDto {
    @ApiProperty({ example: 'https://storage.example.com/evidence/photo1.jpg', description: 'URL to the evidence file' })
    @IsString()
    @IsNotEmpty()
    fileUrl: string;

    @ApiPropertyOptional({ example: 'PHOTO', description: 'Type of evidence (e.g., PHOTO, VIDEO, DOCUMENT)' })
    @IsString()
    @IsOptional()
    evidenceType?: string;

    @ApiPropertyOptional({ example: 'Foundation laid — 40% complete', description: 'Description of the evidence' })
    @IsString()
    @IsOptional()
    description?: string;
}
