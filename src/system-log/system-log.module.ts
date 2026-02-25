import { Module, Global } from '@nestjs/common';
import { SystemLogService } from './system-log.service';
import { SystemLogController } from './system-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [SystemLogService],
    controllers: [SystemLogController],
    exports: [SystemLogService],
})
export class SystemLogModule { }
