import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLevel } from '@prisma/client';

@Injectable()
export class AdminUnitService {
    constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) { }

    async findAll(level?: AdminLevel, parentId?: number) {
        return this.prisma.adminUnit.findMany({
            where: {
                level: level || undefined,
                parentId: parentId || undefined,
            },
            orderBy: { level: 'asc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
    }

    async findUnallocated(level?: AdminLevel) {
        return this.prisma.adminUnit.findMany({
            where: {
                level: level || undefined,
                users: {
                    none: {}
                }
            },
            orderBy: { level: 'asc' }
        });
    }

    async findOne(id: number) {
        return this.prisma.adminUnit.findUnique({
            where: { id },
            include: {
                children: true,
                parent: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
    }
}
