import { Module } from '@nestjs/common';
import { LocationMgmtService } from './location-mgmt.service';
import { LocationMgmtController } from './location-mgmt.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [LocationMgmtService],
    controllers: [LocationMgmtController],
})
export class LocationMgmtModule { }
