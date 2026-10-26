import { prisma } from '../config/prisma';

export class AuditService {
  async findAll(query: { entityName?: string; action?: string; limit?: number }) {
    const where: any = {};
    if (query.entityName) where.entityName = query.entityName;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };

    return prisma.auditTrail.findMany({
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

  async getByEntity(entityName: string, entityId: string) {
    return prisma.auditTrail.findMany({
      where: { entityName, entityId },
      orderBy: { timestamp: 'desc' },
      include: {
        performedBy: {
          select: {
            fullName: true,
            employeeId: true,
            role: true,
          },
        },
      },
    });
  }
}

export const auditService = new AuditService();
