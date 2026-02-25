import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) { }

    async create(dto: {
        recipientId: number;
        senderId?: number;
        type: NotificationType;
        title: string;
        message: string;
        linkId?: number;
        linkTable?: string;
    }) {
        return this.prisma.notification.create({
            data: dto,
        });
    }

    async findForUser(userId: number) {
        return this.prisma.notification.findMany({
            where: { recipientId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAll(limit = 100) {
        return this.prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                recipient: {
                    select: { id: true, name: true, email: true }
                },
                sender: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    async markAsRead(id: number, userId: number) {
        return this.prisma.notification.update({
            where: { id, recipientId: userId },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markAllAsRead(userId: number) {
        return this.prisma.notification.updateMany({
            where: { recipientId: userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }
}
