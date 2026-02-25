import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActionType } from '@prisma/client';

@Injectable()
export class SystemLogService {
    private readonly logger = new Logger(SystemLogService.name);

    constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) { }

    async log(
        userId: number,
        action: ActionType,
        tableName: string,
        recordId: number,
        oldValue?: any,
        newValue?: any,
        ipAddress?: string,
    ) {
        try {
            await this.prisma.systemLog.create({
                data: {
                    userId,
                    action,
                    tableName,
                    recordId,
                    oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
                    newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
                    ipAddress,
                },
            });
            this.logger.log(`Action logged: ${action} on ${tableName} (ID: ${recordId})`);
        } catch (error) {
            this.logger.error(`Failed to create system log: ${error.message}`);
        }
    }

    async findAll(limit = 100) {
        return this.prisma.systemLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });
    }

    async findByTable(tableName: string, recordId?: number) {
        return this.prisma.systemLog.findMany({
            where: {
                tableName,
                recordId: recordId ? recordId : undefined,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async count() {
        return this.prisma.systemLog.count();
    }
}
