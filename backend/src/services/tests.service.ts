import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export class TestsService {
  async findAllSpecifications() {
    return prisma.testSpecification.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createSpecification(dto: any, user: any) {
    const spec = await prisma.testSpecification.create({
      data: {
        testCode: dto.testCode,
        name: dto.name,
        category: dto.category as any,
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
        reasonForChange: `Created master specification ${spec.testCode}`,
      },
    });

    return spec;
  }

  async getTestById(id: string) {
    const test = await prisma.sampleTest.findUnique({
      where: { id },
      include: {
        sample: { include: { batch: true } },
        testSpecification: true,
        instrument: true,
        analyst: { select: { id: true, fullName: true, employeeId: true } },
        oosIncidents: true,
      },
    });

    if (!test) throw new AppError('Sample test record not found', 404);
    return test;
  }

  async recordResult(id: string, dto: any, user: any) {
    const test = await prisma.sampleTest.findUnique({
      where: { id },
      include: { sample: true, testSpecification: true },
    });

    if (!test) throw new AppError('Sample test not found', 404);

    let calculatedResultStatus: 'WITHIN_SPEC' | 'OUT_OF_SPEC' | 'NOT_TESTED' = 'WITHIN_SPEC';

    if (dto.numericResult !== undefined && dto.numericResult !== null) {
      const val = dto.numericResult;
      const min = test.minLimit ?? test.testSpecification.defaultMinLimit;
      const max = test.maxLimit ?? test.testSpecification.defaultMaxLimit;

      if (min !== null && min !== undefined && val < min) {
        calculatedResultStatus = 'OUT_OF_SPEC';
      } else if (max !== null && max !== undefined && val > max) {
        calculatedResultStatus = 'OUT_OF_SPEC';
      } else {
        calculatedResultStatus = 'WITHIN_SPEC';
      }
    }

    return prisma.$transaction(async (tx) => {
      const updatedTest = await tx.sampleTest.update({
        where: { id },
        data: {
          numericResult: dto.numericResult,
          textResult: dto.textResult,
          resultStatus: calculatedResultStatus,
          status: 'COMPLETED',
          completedAt: new Date(),
          instrumentId: dto.instrumentId,
          analystId: user.id,
        },
      });

      if (calculatedResultStatus === 'OUT_OF_SPEC') {
        const oosCount = await tx.oosIncident.count();
        const year = new Date().getFullYear();
        const incidentNumber = `OOS-${year}-${String(oosCount + 1).padStart(4, '0')}`;

        await tx.oosIncident.create({
          data: {
            incidentNumber,
            sampleId: test.sampleId,
            sampleTestId: test.id,
            reportedById: user.id,
            capaDescription: `Auto-generated OOS: Result ${dto.numericResult} is out of specification for test ${test.testSpecification.name}`,
            phaseOneStatus: 'INVESTIGATING',
          },
        });
      }

      await tx.auditTrail.create({
        data: {
          entityName: 'SampleTest',
          entityId: id,
          action: 'TEST_RESULT_RECORDED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          diffPayload: JSON.stringify({
            oldValue: { numericResult: test.numericResult, status: test.status },
            newValue: { numericResult: dto.numericResult, status: 'COMPLETED', resultStatus: calculatedResultStatus },
          }),
          reasonForChange: `Recorded result for test ${test.testSpecification.name}`,
        },
      });

      return updatedTest;
    });
  }

  async verifyTest(id: string, user: any) {
    const test = await prisma.sampleTest.findUnique({
      where: { id },
      include: { testSpecification: true },
    });

    if (!test) throw new AppError('Sample test not found', 404);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.sampleTest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          analystId: user.id,
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'SampleTest',
          entityId: id,
          action: 'TEST_VERIFIED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: `Verified analytical test ${test.testSpecification.name}`,
        },
      });

      return updated;
    });
  }
}

export const testsService = new TestsService();
