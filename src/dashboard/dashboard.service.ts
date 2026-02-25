import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActionType } from '@prisma/client';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) { }

    async getHealth() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'ok', database: 'connected', timestamp: new Date() };
        } catch (error) {
            this.logger.error(`Health check failed: ${error.message}`);
            return { status: 'error', database: 'disconnected', error: error.message };
        }
    }

    async getSystemStats() {
        const [
            userCount,
            taskCount,
            logCount,
            emailCount,
            notificationCount,
            unallocatedCount,
            totalUnits
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.imihigoTask.count(),
            this.prisma.systemLog.count(),
            this.prisma.emailLog.count(),
            this.prisma.notification.count(),
            this.prisma.adminUnit.count({
                where: { users: { none: {} } }
            }),
            this.prisma.adminUnit.count(),
        ]);

        return {
            users: userCount,
            tasks: taskCount,
            systemLogs: logCount,
            emailsSent: emailCount,
            notificationsSent: notificationCount,
            adminUnits: {
                total: totalUnits,
                unallocated: unallocatedCount,
                allocationRate: totalUnits > 0 ? ((totalUnits - unallocatedCount) / totalUnits * 100).toFixed(2) + '%' : '0%'
            }
        };
    }

    async getActiveUsers(limit = 10) {
        return this.prisma.systemLog.findMany({
            where: {
                action: ActionType.LOGIN,
            },
            orderBy: {
                createdAt: 'desc',
            },
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
}
