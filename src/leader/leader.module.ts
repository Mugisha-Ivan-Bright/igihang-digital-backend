import { Module } from '@nestjs/common';
import { LeaderService } from './leader.service';
import { LeaderController } from './leader.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
    imports: [PrismaModule, NotificationModule, CloudinaryModule],
    providers: [LeaderService],
    controllers: [LeaderController],
})
export class LeaderModule { }
