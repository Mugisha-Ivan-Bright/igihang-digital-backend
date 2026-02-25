import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationMgmtService {
    constructor(@Inject('PRISMA_TOKEN') private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.location.findMany({
            include: {
                adminUnit: true,
                user: { select: { id: true, name: true, role: true } },
                task: { select: { id: true, title: true } }
            }
        });
    }
}
