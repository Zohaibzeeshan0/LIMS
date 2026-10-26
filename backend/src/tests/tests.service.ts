import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordResultDto } from './dto/record-result.dto';
import { CreateSpecDto } from './dto/create-spec.dto';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async findAllSpecifications() {
    return this.prisma.testSpecification.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createSpecification(dto: CreateSpecDto, user: any) {
    const spec = await this.prisma.testSpecification.create({
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

    await this.prisma.auditTrail.create({
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
    const test = await this.prisma.sampleTest.findUnique({
      where: { id },
      include: {
        sample: { include: { batch: true } },
        testSpecification: true,
        instrument: true,
        analyst: { select: { id: true, fullName: true, employeeId: true } },
        oosIncidents: true,
      },
    });

    if (!test) throw new NotFoundException('Sample test record not found');
    return test;
  }

  async recordResult(id: string, dto: RecordResultDto, user: any) {
    const test = await this.prisma.sampleTest.findUnique({
      where: { id },
      include: { sample: true, testSpecification: true },
    });

    if (!test) throw new NotFoundException('Sample test not found');

    // Strict RBAC: Non-supervisors can only record results on their assigned tests/samples
    const isSupervisorOrAdmin = ['ADMIN', 'QA_MANAGER'].includes(user.role);

    if (
      !isSupervisorOrAdmin &&
      test.analystId !== user.id &&
      test.sample.assignedToId !== user.id
    ) {
      throw new ForbiddenException(
        'Access Denied: You cannot record results on a test assigned to another analyst.'
      );
    }

    // Automatic OOS Detection Logic
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

    return this.prisma.$transaction(async (tx) => {
      const updatedTest = await tx.sampleTest.update({
        where: { id },
        data: {
          numericResult: dto.numericResult,
          textResult: dto.textResult,
          rawDataReference: dto.rawDataReference,
          instrumentId: dto.instrumentId || test.instrumentId,
          comments: dto.comments,
          status: 'COMPLETED',
          resultStatus: calculatedResultStatus as any,
          testDate: new Date(),
          completedAt: new Date(),
          analystId: user.id,
        },
        include: {
          testSpecification: true,
          sample: true,
          instrument: true,
          analyst: { select: { id: true, fullName: true } },
        },
      });

      // If OUT_OF_SPEC, automatically generate OOS Incident if not already initiated
      let autoOos = null;
      if (calculatedResultStatus === 'OUT_OF_SPEC') {
        const existingOos = await tx.oosIncident.findFirst({
          where: { sampleTestId: id },
        });

        if (!existingOos) {
          const year = new Date().getFullYear();
          const count = await tx.oosIncident.count();
          const incidentNumber = `OOS-${year}-${(count + 1).toString().padStart(4, '0')}`;

          autoOos = await tx.oosIncident.create({
            data: {
              incidentNumber,
              sampleTestId: id,
              sampleId: test.sampleId,
              reportedById: user.id,
              phaseOneStatus: 'INVESTIGATING',
              rootCauseCategory: 'UNDER_INVESTIGATION',
              capaDescription: `Immediate containment: Analytical result ${dto.numericResult} ${test.unit || ''} outside specification (${test.minLimit ?? 'N/A'} - ${test.maxLimit ?? 'N/A'}). Retest and instrument check required.`,
            },
          });
        }
      }

      // Check if all tests for this sample are completed to transition sample status
      const allSampleTests = await tx.sampleTest.findMany({
        where: { sampleId: test.sampleId },
      });

      const allCompleted = allSampleTests.every(
        (t) => t.id === id || t.status === 'COMPLETED' || t.status === 'VERIFIED',
      );

      const hasAnyOos = allSampleTests.some(
        (t) => (t.id === id ? calculatedResultStatus : t.resultStatus) === 'OUT_OF_SPEC',
      );

      await tx.sample.update({
        where: { id: test.sampleId },
        data: {
          status: allCompleted ? 'REVIEW_PENDING' : 'TESTING_IN_PROGRESS',
        },
      });

      // Log 21 CFR Part 11 compliant audit trail
      await tx.auditTrail.create({
        data: {
          entityName: 'SampleTest',
          entityId: id,
          action: 'TEST_RESULT_RECORDED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: dto.comments || 'Analytical result input by analyst',
          diffPayload: JSON.stringify({
            testName: test.testSpecification.name,
            numericResult: dto.numericResult,
            unit: test.unit,
            specification: `${test.minLimit ?? ''} - ${test.maxLimit ?? ''}`,
            resultStatus: calculatedResultStatus,
            oosTriggered: !!autoOos,
          }),
        },
      });

      return {
        test: updatedTest,
        oosIncident: autoOos,
        sampleStatusUpdated: allCompleted ? 'REVIEW_PENDING' : 'TESTING_IN_PROGRESS',
      };
    });
  }

  async verifyTest(id: string, user: any) {
    const test = await this.prisma.sampleTest.findUnique({
      where: { id },
      include: { testSpecification: true, sample: true },
    });
    if (!test) throw new NotFoundException('Test not found');

    const updated = await this.prisma.sampleTest.update({
      where: { id },
      data: { status: 'VERIFIED' },
      include: {
        testSpecification: true,
        instrument: true,
        analyst: { select: { id: true, fullName: true } },
      },
    });

    await this.prisma.auditTrail.create({
      data: {
        entityName: 'SampleTest',
        entityId: id,
        action: 'TEST_VERIFIED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Verified analytical test result for ${test.testSpecification.name}`,
      },
    });

    return updated;
  }
}
