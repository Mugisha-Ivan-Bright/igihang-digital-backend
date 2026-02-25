import { Module } from '@nestjs/common';
import { AdminUnitService } from './admin-unit.service';
import { AdminUnitController } from './admin-unit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [AdminUnitService],
    controllers: [AdminUnitController],
    exports: [AdminUnitService],
})
export class AdminUnitModule { }
