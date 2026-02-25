import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskMgmtService {
    constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) { }

    async findAll(status?: any) {
        return this.prisma.imihigoTask.findMany({
            where: status ? { status } : undefined,
            include: {
                issuer: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } },
                unit: true,
                _count: {
                    select: { evidence: true, comments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findEvidence() {
        return this.prisma.taskEvidence.findMany({
            include: {
                uploadedBy: { select: { id: true, name: true, email: true } },
                task: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findComments() {
        return this.prisma.commentAudit.findMany({
            include: {
                author: { select: { id: true, name: true, email: true } },
                task: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
