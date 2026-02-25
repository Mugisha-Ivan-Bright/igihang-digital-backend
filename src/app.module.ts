import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { SystemLogModule } from './system-log/system-log.module';
import { NotificationModule } from './notifications/notification.module';
import { AdminUnitModule } from './admin-unit/admin-unit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TaskMgmtModule } from './tasks/task-mgmt.module';
import { LocationMgmtModule } from './location/location-mgmt.module';
import { LeaderModule } from './leader/leader.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    MailModule,
    SystemLogModule,
    NotificationModule,
    AdminUnitModule,
    DashboardModule,
    TaskMgmtModule,
    LocationMgmtModule,
    LeaderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
