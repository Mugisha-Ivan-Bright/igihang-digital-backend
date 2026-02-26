import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    Inject,
    BadRequestException,
} from '@nestjs/common';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationType, TaskStatus, UserRole } from '@prisma/client';
import { AssignTaskDto } from './dto/assign-task.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { AddCommentDto } from './dto/add-comment.dto';

// Maps a role to the roles it directly manages
const SUBORDINATE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
    [UserRole.GOVERNOR]: [UserRole.MAYOR],
    [UserRole.MAYOR]: [UserRole.EXECUTIVE_SEC],
    [UserRole.EXECUTIVE_SEC]: [UserRole.VILLAGE_CHIEF],
};

// Maps a role to its direct superior role
const SUPERIOR_ROLES: Partial<Record<UserRole, UserRole[]>> = {
    [UserRole.MAYOR]: [UserRole.GOVERNOR],
    [UserRole.EXECUTIVE_SEC]: [UserRole.MAYOR],
    [UserRole.VILLAGE_CHIEF]: [UserRole.EXECUTIVE_SEC],
};

@Injectable()
export class LeaderService {
    constructor(
        @Inject('PRISMA_TOKEN') private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    // ─── Hierarchy ────────────────────────────────────────────────────────────

    async getSubordinates(userId: number) {
        const me = await this.getUser(userId);
        const subordinateRoles = SUBORDINATE_ROLES[me.role];
        if (!subordinateRoles || subordinateRoles.length === 0) {
            return [];
        }

        // Get all child admin units (one level deep) of my unit
        const childUnits = await this.prisma.adminUnit.findMany({
            where: { parentId: me.adminUnitId ?? undefined },
            select: { id: true },
        });
        const childUnitIds = [
            me.adminUnitId!,
            ...childUnits.map((u) => u.id),
        ];

        return this.prisma.user.findMany({
            where: {
                role: { in: subordinateRoles },
                adminUnitId: { in: childUnitIds },
            },
            omit: { passwordHash: true, refreshToken: true, refreshTokenExpires: true },
            include: {
                adminUnit: true,
                assignedTasks: {
                    select: { id: true, title: true, status: true, deadline: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async getSuperiors(userId: number) {
        const me = await this.getUser(userId);
        const superiorRoles = SUPERIOR_ROLES[me.role];
        if (!superiorRoles || superiorRoles.length === 0) {
            return [];
        }

        // Walk up the admin unit hierarchy
        const parentUnit = await this.prisma.adminUnit.findFirst({
            where: { id: me.adminUnitId ?? undefined },
            include: { parent: true },
        });
        const parentUnitIds: number[] = [];
        if (parentUnit?.parentId) parentUnitIds.push(parentUnit.parentId);
        if (parentUnit?.parent?.parentId) parentUnitIds.push(parentUnit.parent.parentId);

        return this.prisma.user.findMany({
            where: {
                role: { in: superiorRoles },
                adminUnitId: parentUnitIds.length > 0
                    ? { in: parentUnitIds }
                    : me.adminUnitId
                        ? undefined  // fallback: same unit
                        : undefined,
            },
            omit: { passwordHash: true, refreshToken: true, refreshTokenExpires: true },
            include: { adminUnit: true },
            orderBy: { name: 'asc' },
        });
    }

    // ─── Tasks ─────────────────────────────────────────────────────────────────

    async getMyTasks(userId: number) {
        return this.prisma.imihigoTask.findMany({
            where: { assigneeId: userId },
            include: this.taskIncludes(),
            orderBy: { deadline: 'asc' },
        });
    }

    async getUnitTasks(userId: number, status?: TaskStatus) {
        const me = await this.getUser(userId);
        const unitIds = await this.getScopeUnitIds(me.adminUnitId);

        return this.prisma.imihigoTask.findMany({
            where: {
                unitId: { in: unitIds },
                ...(status ? { status } : {}),
            },
            include: this.taskIncludes(),
            orderBy: { deadline: 'asc' },
        });
    }

    async assignTask(dto: AssignTaskDto, issuerId: number) {
        const assignee = await this.prisma.user.findUnique({
            where: { id: dto.assigneeId },
        });
        if (!assignee) throw new NotFoundException('Assignee not found');

        const task = await this.prisma.imihigoTask.create({
            data: {
                title: dto.title,
                description: dto.description,
                issuerId,
                assigneeId: dto.assigneeId,
                unitId: dto.unitId,
                deadline: new Date(dto.deadline),
                status: TaskStatus.PENDING,
            },
            include: this.taskIncludes(),
        });

        // Notify the assignee
        await this.notificationService.create({
            recipientId: dto.assigneeId,
            senderId: issuerId,
            type: NotificationType.TASK_ASSIGNED,
            title: 'New Task Assigned',
            message: `You have been assigned: "${task.title}"`,
            linkId: task.id,
            linkTable: 'ImihigoTask',
        });

        return task;
    }

    async updateTaskStatus(taskId: number, status: TaskStatus, userId: number) {
        const task = await this.prisma.imihigoTask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.assigneeId !== userId && task.issuerId !== userId) {
            throw new ForbiddenException('Only the assignee or issuer can update this task');
        }

        const updated = await this.prisma.imihigoTask.update({
            where: { id: taskId },
            data: { status },
            include: this.taskIncludes(),
        });

        // Notify the other party
        const notifyId = userId === task.issuerId ? task.assigneeId : task.issuerId;
        await this.notificationService.create({
            recipientId: notifyId,
            senderId: userId,
            type: NotificationType.STATUS_CHANGED,
            title: 'Task Status Updated',
            message: `Task "${task.title}" status changed to ${status}`,
            linkId: task.id,
            linkTable: 'ImihigoTask',
        });

        return updated;
    }

    // ─── Evidence ──────────────────────────────────────────────────────────────

    async addEvidence(taskId: number, dto: AddEvidenceDto, uploaderId: number) {
        const task = await this.prisma.imihigoTask.findUnique({
            where: { id: taskId },
            include: {
                issuer: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
            }
        });
        if (!task) throw new NotFoundException('Task not found');

        const evidence = await this.prisma.taskEvidence.create({
            data: {
                fileUrl: dto.fileUrl,
                evidenceType: dto.evidenceType,
                description: dto.description,
                taskId,
                uploadedById: uploaderId,
            },
            include: {
                uploadedBy: { select: { id: true, name: true, email: true } },
                task: { select: { id: true, title: true } },
            },
        });

        // Get uploader name for notification message
        const uploader = await this.prisma.user.findUnique({
            where: { id: uploaderId },
            select: { name: true }
        });

        // Notify both issuer and assignee (skip the uploader)
        const notifyIds = [task.issuerId, task.assigneeId].filter((id) => id !== uploaderId);
        for (const recipientId of notifyIds) {
            await this.notificationService.create({
                recipientId,
                senderId: uploaderId,
                type: NotificationType.EVIDENCE_UPLOADED,
                title: 'Evidence Uploaded',
                message: `${uploader?.name || 'Someone'} uploaded new evidence for task "${task.title}"${dto.description ? ': ' + dto.description : ''}`,
                linkId: task.id,
                linkTable: 'ImihigoTask',
            });
        }

        return evidence;
    }

    async uploadEvidence(
        taskId: number,
        file: Express.Multer.File,
        description: string,
        uploaderId: number,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const task = await this.prisma.imihigoTask.findUnique({
            where: { id: taskId },
            include: {
                issuer: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
            }
        });
        if (!task) throw new NotFoundException('Task not found');

        // Upload to Cloudinary
        const uploadResult = await this.cloudinaryService.uploadFile(file, 'igihango/evidence');

        // Create evidence record with Cloudinary URL
        const evidence = await this.prisma.taskEvidence.create({
            data: {
                fileUrl: uploadResult.secure_url,
                evidenceType: file.mimetype,
                description: description || `${file.originalname}`,
                taskId,
                uploadedById: uploaderId,
            },
            include: {
                uploadedBy: { select: { id: true, name: true, email: true } },
                task: { select: { id: true, title: true } },
            },
        });

        // Get uploader name for notification message
        const uploader = await this.prisma.user.findUnique({
            where: { id: uploaderId },
            select: { name: true }
        });

        // Notify both issuer and assignee (skip the uploader)
        const notifyIds = [task.issuerId, task.assigneeId].filter((id) => id !== uploaderId);
        for (const recipientId of notifyIds) {
            await this.notificationService.create({
                recipientId,
                senderId: uploaderId,
                type: NotificationType.EVIDENCE_UPLOADED,
                title: 'Evidence Uploaded',
                message: `${uploader?.name || 'Someone'} uploaded new evidence for task "${task.title}"${description ? ': ' + description : ''}`,
                linkId: task.id,
                linkTable: 'ImihigoTask',
            });
        }

        return {
            ...evidence,
            cloudinaryPublicId: uploadResult.public_id,
            fileSize: uploadResult.bytes,
            format: uploadResult.format,
        };
    }

    async getTaskEvidence(taskId: number) {
        await this.ensureTaskExists(taskId);
        return this.prisma.taskEvidence.findMany({
            where: { taskId },
            include: {
                uploadedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ─── Comments ──────────────────────────────────────────────────────────────

    async addComment(taskId: number, dto: AddCommentDto, authorId: number) {
        const task = await this.prisma.imihigoTask.findUnique({
            where: { id: taskId },
            include: {
                issuer: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
            }
        });
        if (!task) throw new NotFoundException('Task not found');

        const comment = await this.prisma.commentAudit.create({
            data: {
                content: dto.content,
                taskId,
                authorId,
            },
            include: {
                author: { select: { id: true, name: true, email: true } },
            },
        });

        // Get author name for notification message
        const author = await this.prisma.user.findUnique({
            where: { id: authorId },
            select: { name: true }
        });

        // Notify both issuer and assignee (skip the commenter)
        const notifyIds = [task.issuerId, task.assigneeId].filter((id) => id !== authorId);
        for (const recipientId of notifyIds) {
            await this.notificationService.create({
                recipientId,
                senderId: authorId,
                type: NotificationType.COMMENT_ADDED,
                title: 'New Comment on Task',
                message: `${author?.name || 'Someone'} commented on "${task.title}": ${dto.content.substring(0, 100)}${dto.content.length > 100 ? '...' : ''}`,
                linkId: task.id,
                linkTable: 'ImihigoTask',
            });
        }

        return comment;
    }

    async getTaskComments(taskId: number) {
        await this.ensureTaskExists(taskId);
        return this.prisma.commentAudit.findMany({
            where: { taskId },
            include: {
                author: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    // ─── Progress ──────────────────────────────────────────────────────────────

    async getProgress(userId: number, targetUnitId?: number) {
        const me = await this.getUser(userId);
        const rootUnitId = targetUnitId ?? me.adminUnitId;
        const unitIds = await this.getScopeUnitIds(rootUnitId);

        const tasks = await this.prisma.imihigoTask.groupBy({
            by: ['status', 'unitId'],
            where: { unitId: { in: unitIds } },
            _count: { id: true },
        });

        // Fetch unit names for context
        const units = await this.prisma.adminUnit.findMany({
            where: { id: { in: unitIds } },
            select: { id: true, name: true, level: true },
        });
        const unitMap = Object.fromEntries(units.map((u) => [u.id, u]));

        // Aggregate per unit
        const summary: Record<number, any> = {};
        for (const row of tasks) {
            const uid = row.unitId;
            if (!summary[uid]) {
                summary[uid] = {
                    unit: unitMap[uid],
                    total: 0,
                    PENDING: 0,
                    IN_PROGRESS: 0,
                    COMPLETED: 0,
                    OVERDUE: 0,
                };
            }
            summary[uid][row.status] = row._count.id;
            summary[uid].total += row._count.id;
        }

        return Object.values(summary).map((s) => ({
            ...s,
            completionRate: s.total > 0
                ? Math.round((s.COMPLETED / s.total) * 100)
                : 0,
        }));
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private async getUser(userId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    private async ensureTaskExists(taskId: number) {
        const task = await this.prisma.imihigoTask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    /** Collect the IDs of a unit and all its descendant units */
    private async getScopeUnitIds(rootUnitId: number | null | undefined): Promise<number[]> {
        if (!rootUnitId) return [];
        const ids: number[] = [rootUnitId];
        const queue = [rootUnitId];
        while (queue.length) {
            const current = queue.shift()!;
            const children = await this.prisma.adminUnit.findMany({
                where: { parentId: current },
                select: { id: true },
            });
            for (const c of children) {
                ids.push(c.id);
                queue.push(c.id);
            }
        }
        return ids;
    }

    private taskIncludes() {
        return {
            issuer: { select: { id: true, name: true, email: true, role: true } },
            assignee: { select: { id: true, name: true, email: true, role: true } },
            unit: true,
            _count: { select: { evidence: true, comments: true } },
        } as const;
    }

    // ─── Leadership Tree ───────────────────────────────────────────────────────

    /**
     * Returns a nested JSON tree of every leader below the caller,
     * all the way down to VILLAGE_CHIEF, with full user and task details.
     * Uses two bulk queries + in-memory assembly to avoid N+1 problems.
     */
    async getLeadershipTree(userId: number) {
        const me = await this.getUser(userId);
        if (!me.adminUnitId) return null;

        // 1. Fetch all admin units in the caller's scope
        const unitIds = await this.getScopeUnitIds(me.adminUnitId);

        const [allUnits, allUsers] = await Promise.all([
            this.prisma.adminUnit.findMany({
                where: { id: { in: unitIds } },
                select: { id: true, name: true, level: true, code: true, parentId: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.user.findMany({
                where: {
                    adminUnitId: { in: unitIds },
                    role: {
                        in: [
                            UserRole.GOVERNOR,
                            UserRole.MAYOR,
                            UserRole.EXECUTIVE_SEC,
                            UserRole.VILLAGE_CHIEF,
                        ],
                    },
                    id: { not: userId }, // exclude self
                },
                omit: { passwordHash: true, refreshToken: true, refreshTokenExpires: true },
                include: {
                    adminUnit: { select: { id: true, name: true, level: true, code: true } },
                    location: { select: { id: true, latitude: true, longitude: true } },
                    assignedTasks: {
                        select: {
                            id: true, title: true, status: true, deadline: true,
                            _count: { select: { evidence: true, comments: true } },
                        },
                        orderBy: { deadline: 'asc' },
                    },
                    issuedTasks: {
                        select: { id: true, title: true, status: true, deadline: true },
                        orderBy: { deadline: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
            }),
        ]);

        // Build lookup maps
        const unitMap = new Map(allUnits.map((u) => [u.id, u]));
        // Map: adminUnitId → list of users assigned to that unit
        const usersByUnit = new Map<number, typeof allUsers>();
        for (const user of allUsers) {
            if (user.adminUnitId === null) continue;
            if (!usersByUnit.has(user.adminUnitId)) {
                usersByUnit.set(user.adminUnitId, []);
            }
            usersByUnit.get(user.adminUnitId)!.push(user);
        }

        // Recursively build the tree node for a given admin unit
        const buildNode = (unitId: number): any => {
            const unit = unitMap.get(unitId);
            if (!unit) return null;

            const leaders = (usersByUnit.get(unitId) ?? []).map((u) => ({
                ...u,
                subordinates: [], // will be populated by child unit traversal
            }));

            // Find child units
            const childUnits = allUnits.filter((u) => u.parentId === unitId);
            const childNodes = childUnits
                .map((u) => buildNode(u.id))
                .filter(Boolean);

            return {
                unit,
                leaders,
                children: childNodes,
            };
        };

        return buildNode(me.adminUnitId);
    }
}
