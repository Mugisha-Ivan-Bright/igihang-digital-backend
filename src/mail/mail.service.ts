import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) {
        this.transporter = nodemailer.createTransport({
            host: (process.env.MAIL_HOST as string) || 'smtp.mailtrap.io',
            port: parseInt(process.env.MAIL_PORT as string) || 2525,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }

    async sendMail(to: string, subject: string, body: string, html = false) {
        try {
            const info = await this.transporter.sendMail({
                from: '"Igihango Digital" <noreply@igihango.rw>',
                to,
                subject,
                [html ? 'html' : 'text']: body,
            });

            this.logger.log(`Email sent to ${to}: ${info.messageId}`);

            // Log to database
            await this.prisma.emailLog.create({
                data: {
                    recipientEmail: to,
                    subject,
                    status: 'SENT',
                    sentAt: new Date(),
                }
            });

            return info;
        } catch (error) {
            this.logger.error(`Error sending email to ${to}: ${error.message}`);

            // Log failure
            await this.prisma.emailLog.create({
                data: {
                    recipientEmail: to,
                    subject,
                    status: 'FAILED',
                }
            });

            throw error;
        }
    }

    async sendPasswordResetEmail(to: string, token: string) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        const body = `You requested a password reset. Click here to reset it: ${resetUrl}`;
        return this.sendMail(to, 'Password Reset Request', body);
    }

    async findAllLogs(limit = 100) {
        return this.prisma.emailLog.findMany({
            orderBy: { sentAt: 'desc' },
            take: limit,
            include: {
                task: true
            }
        });
    }
}
