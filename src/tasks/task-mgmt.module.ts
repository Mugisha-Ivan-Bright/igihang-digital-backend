import { Module } from '@nestjs/common';
import { TaskMgmtService } from './task-mgmt.service';
import { TaskMgmtController } from './task-mgmt.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [TaskMgmtService],
    controllers: [TaskMgmtController],
})
export class TaskMgmtModule { }
