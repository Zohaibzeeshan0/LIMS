import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { entityName?: string; action?: string; limit?: number }) {
    const where: any = {};
    if (query.entityName) where.entityName = query.entityName;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };

    return this.prisma.auditTrail.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(query.limit) || 100,
      include: {
        performedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            department: true,
            role: true,
          },
        },
      },
    });
  }

  async findByEntity(entityName: string, entityId: string) {
    return this.prisma.auditTrail.findMany({
      where: { entityName, entityId },
      orderBy: { timestamp: 'desc' },
      include: {
        performedBy: {
          select: { fullName: true, employeeId: true, role: true },
        },
      },
    });
  }
}
