import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class TaskSchedulerService {
    private readonly logger = new Logger(TaskSchedulerService.name);

    constructor(
        @Inject('PRISMA_TOKEN') private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
    ) { }

    /**
     * Check for overdue tasks and update their status
     * Runs every day at midnight (00:00)
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async checkOverdueTasks() {
        this.logger.log('Running overdue tasks check...');

        try {
            const now = new Date();

            // Find tasks that are overdue but not marked as such
            const overdueTasks = await this.prisma.imihigoTask.findMany({
                where: {
                    deadline: { lt: now },
                    status: { notIn: ['COMPLETED', 'OVERDUE'] },
                },
                include: {
                    assignee: true,
                    issuer: true,
                },
            });

            // Update tasks to OVERDUE status
            if (overdueTasks.length > 0) {
                await this.prisma.imihigoTask.updateMany({
                    where: {
                        id: { in: overdueTasks.map(t => t.id) },
                    },
                    data: { status: 'OVERDUE' },
                });

                // Send notifications to assignees and issuers
                for (const task of overdueTasks) {
                    // Notify assignee
                    await this.notificationService.create({
                        recipientId: task.assigneeId,
                        type: NotificationType.SYSTEM_ALERT,
                        title: 'Task Overdue',
                        message: `Task "${task.title}" is now overdue. Please complete it as soon as possible.`,
                        linkId: task.id,
                        linkTable: 'ImihigoTask',
                    });

                    // Notify issuer
                    await this.notificationService.create({
                        recipientId: task.issuerId,
                        type: NotificationType.SYSTEM_ALERT,
                        title: 'Task Overdue Alert',
                        message: `Task "${task.title}" assigned to ${task.assignee.name} is now overdue.`,
                        linkId: task.id,
                        linkTable: 'ImihigoTask',
                    });
                }

                this.logger.log(`Updated ${overdueTasks.length} tasks to OVERDUE status`);
            } else {
                this.logger.log('No overdue tasks found');
            }
        } catch (error) {
            this.logger.error('Error checking overdue tasks:', error);
        }
    }

    /**
     * Send reminders for tasks approaching deadline (3 days before)
     * Runs every day at 9:00 AM
     */
    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async sendDeadlineReminders() {
        this.logger.log('Sending deadline reminders...');

        try {
            const now = new Date();
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
            threeDaysFromNow.setHours(23, 59, 59, 999);

            // Find tasks due within 3 days
            const upcomingTasks = await this.prisma.imihigoTask.findMany({
                where: {
                    deadline: {
                        gte: now,
                        lte: threeDaysFromNow,
                    },
                    status: { notIn: ['COMPLETED', 'OVERDUE'] },
                },
                include: {
                    assignee: true,
                    issuer: true,
                },
            });

            for (const task of upcomingTasks) {
                const daysUntilDeadline = Math.ceil(
                    (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Notify assignee
                await this.notificationService.create({
                    recipientId: task.assigneeId,
                    senderId: task.issuerId,
                    type: NotificationType.SYSTEM_ALERT,
                    title: 'Task Deadline Approaching',
                    message: `Task "${task.title}" is due in ${daysUntilDeadline} day(s). Please ensure timely completion.`,
                    linkId: task.id,
                    linkTable: 'ImihigoTask',
                });

                // Notify issuer
                await this.notificationService.create({
                    recipientId: task.issuerId,
                    type: NotificationType.SYSTEM_ALERT,
                    title: 'Task Deadline Reminder',
                    message: `Task "${task.title}" assigned to ${task.assignee.name} is due in ${daysUntilDeadline} day(s).`,
                    linkId: task.id,
                    linkTable: 'ImihigoTask',
                });
            }

            this.logger.log(`Sent deadline reminders for ${upcomingTasks.length} tasks`);
        } catch (error) {
            this.logger.error('Error sending deadline reminders:', error);
        }
    }

    /**
     * Manual trigger for overdue check (for testing or admin use)
     */
    async manualOverdueCheck() {
        this.logger.log('Manual overdue check triggered');
        return this.checkOverdueTasks();
    }

    /**
     * Manual trigger for deadline reminders (for testing or admin use)
     */
    async manualDeadlineReminders() {
        this.logger.log('Manual deadline reminders triggered');
        return this.sendDeadlineReminders();
    }
}
