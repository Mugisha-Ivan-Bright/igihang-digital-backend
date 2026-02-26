import { Module } from '@nestjs/common';
import { TaskMgmtService } from './task-mgmt.service';
import { TaskMgmtController } from './task-mgmt.controller';
import { TaskSchedulerService } from './task-scheduler.service';
import { TaskSchedulerController } from './task-scheduler.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [PrismaModule, NotificationModule],
    providers: [TaskMgmtService, TaskSchedulerService],
    controllers: [TaskMgmtController, TaskSchedulerController],
    exports: [TaskSchedulerService],
})
export class TaskMgmtModule { }
