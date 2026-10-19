import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecificationDto } from './dto/create-specification.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.testSpecification.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findByCategory(category: any) {
    return this.prisma.testSpecification.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateSpecificationDto, user: any) {
    const spec = await this.prisma.testSpecification.create({
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

    await this.prisma.auditTrail.create({
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
