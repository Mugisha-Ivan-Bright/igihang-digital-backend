import { Module } from '@nestjs/common';
import { LeaderService } from './leader.service';
import { LeaderController } from './leader.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [PrismaModule, NotificationModule],
    providers: [LeaderService],
    controllers: [LeaderController],
})
export class LeaderModule { }
