import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommentDto {
    @ApiProperty({ example: 'Please upload updated site photos by Friday.', description: 'Comment content' })
    @IsString()
    @IsNotEmpty()
    content: string;
}
