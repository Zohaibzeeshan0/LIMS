import { prisma } from '../config/prisma';

export class CategoriesService {
  async findAll() {
    return prisma.testSpecification.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findByCategory(category: any) {
    return prisma.testSpecification.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: any, user: any) {
    const spec = await prisma.testSpecification.create({
      data: {
        testCode: dto.testCode,
        name: dto.name,
        category: dto.category,
        pharmacopeiaMethod: dto.pharmacopeiaMethod || 'USP',
        defaultMinLimit: dto.defaultMinLimit,
        defaultMaxLimit: dto.defaultMaxLimit,
        defaultTarget: dto.defaultTarget,
        unit: dto.unit,
        procedureOverview: dto.procedureOverview,
        requiresInstrument: dto.requiresInstrument ?? true,
      },
    });

    await prisma.auditTrail.create({
      data: {
        entityName: 'TestSpecification',
        entityId: spec.id,
        action: 'SPEC_CREATED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Created master compendial monograph specification ${spec.testCode}`,
      },
    });

    return spec;
  }
}

export const categoriesService = new CategoriesService();
