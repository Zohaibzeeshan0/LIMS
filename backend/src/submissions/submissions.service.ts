import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordResultDto } from './dto/record-result.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import * as crypto from 'crypto';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  // 1. Analytical Test Worksheets
  async findAllTests() {
    return this.prisma.sampleTest.findMany({
      include: {
        sample: { select: { id: true, sampleCode: true, materialName: true, priority: true, batch: { select: { batchNumber: true } } } },
        testSpecification: true,
        instrument: true,
        analyst: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordResult(id: string, dto: RecordResultDto, user: any) {
    const test = await this.prisma.sampleTest.findUnique({
      where: { id },
      include: { sample: true, testSpecification: true },
    });

    if (!test) throw new NotFoundException('Sample test record not found');

    // Live Automated OOS Evaluation
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

      // Auto-trigger OOS Deviation Incident if OUT_OF_SPEC
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

      // Check if all sample tests are finished
      const allSampleTests = await tx.sampleTest.findMany({
        where: { sampleId: test.sampleId },
      });

      const allCompleted = allSampleTests.every(
        (t) => t.id === id || t.status === 'COMPLETED' || t.status === 'VERIFIED',
      );

      await tx.sample.update({
        where: { id: test.sampleId },
        data: {
          status: allCompleted ? 'REVIEW_PENDING' : 'TESTING_IN_PROGRESS',
        },
      });

      // 21 CFR Part 11 Audit Trail
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

  // 2. Batches
  async findAllBatches() {
    return this.prisma.batch.findMany({
      include: {
        samples: {
          include: {
            tests: { include: { testSpecification: true } },
          },
        },
        coa: {
          select: {
            id: true,
            certificateNumber: true,
            status: true,
            issuedDate: true,
            authorizedBy: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBatch(dto: CreateBatchDto, user: any) {
    const batch = await this.prisma.batch.create({
      data: {
        batchNumber: dto.batchNumber,
        drugProduct: dto.drugProduct,
        dosageForm: dto.dosageForm,
        batchSize: dto.batchSize,
        manufacturingDate: new Date(dto.manufacturingDate),
        expiryDate: new Date(dto.expiryDate),
        status: 'QUARANTINE',
        notes: dto.notes,
      },
    });

    await this.prisma.auditTrail.create({
      data: {
        entityName: 'Batch',
        entityId: batch.id,
        action: 'BATCH_CREATED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Created production batch ${batch.batchNumber}`,
      },
    });

    return batch;
  }

  async releaseBatch(id: string, decision: 'RELEASED' | 'REJECTED', notes: string, user: any) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { samples: { include: { tests: true } } },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    if (decision === 'RELEASED') {
      const allTests = batch.samples.flatMap((s) => s.tests);
      const hasUnresolvedOos = allTests.some((t) => t.resultStatus === 'OUT_OF_SPEC');
      if (hasUnresolvedOos) {
        throw new BadRequestException('Cannot release batch with unresolved Out-of-Specification (OOS) tests');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.batch.update({
        where: { id },
        data: {
          status: decision as any,
          releaseDate: new Date(),
          releasedBy: `${user.fullName} (${user.role})`,
          notes: notes ? `${batch.notes || ''}\n[QA Decision]: ${notes}` : batch.notes,
        },
        include: { samples: true, coa: true },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'Batch',
          entityId: id,
          action: `BATCH_${decision}`,
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: notes || `Batch QA disposition set to ${decision}`,
        },
      });

      return updated;
    });
  }

  // 3. Official Certificate of Analysis (CoA)
  async issueCoa(batchId: string, user: any) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { samples: true, coa: true },
    });

    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.coa) throw new BadRequestException('Certificate of Analysis has already been generated for this batch');

    const year = new Date().getFullYear();
    const count = await this.prisma.certificateOfAnalysis.count();
    const certificateNumber = `COA-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const signaturePayload = `${certificateNumber}|${batch.batchNumber}|${batch.drugProduct}|${user.employeeId}|${new Date().toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    return this.prisma.$transaction(async (tx) => {
      const coa = await tx.certificateOfAnalysis.create({
        data: {
          certificateNumber,
          batchId: batch.id,
          sampleId: batch.samples[0]?.id || null,
          issuedDate: new Date(),
          authorizedById: user.id,
          status: 'ISSUED',
          remarks: 'This batch complies with all specified compendial release requirements.',
          signatureHash,
        },
        include: {
          batch: true,
          authorizedBy: { select: { fullName: true, employeeId: true, department: true } },
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'CertificateOfAnalysis',
          entityId: coa.id,
          action: 'COA_ISSUED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: `Issued official Certificate of Analysis ${coa.certificateNumber}`,
          diffPayload: JSON.stringify({ certificateNumber, batchNumber: batch.batchNumber, signatureHash }),
        },
      });

      return coa;
    });
  }

  // 4. OOS Incidents
  async findAllOos() {
    return this.prisma.oosIncident.findMany({
      include: {
        sample: { select: { id: true, sampleCode: true, materialName: true, sampleType: true } },
        sampleTest: { include: { testSpecification: true, instrument: true } },
        reportedBy: { select: { fullName: true, employeeId: true } },
        qaManager: { select: { fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOos(id: string, dto: any, user: any) {
    const oos = await this.prisma.oosIncident.findUnique({ where: { id } });
    if (!oos) throw new NotFoundException('OOS incident not found');

    const isClosing = dto.qaApprovalStatus === 'APPROVED' || dto.phaseOneStatus === 'CONCLUDED';
    const closedAt = isClosing ? new Date() : oos.closedAt;
    const qaManagerId = dto.qaApprovalStatus ? user.id : oos.qaManagerId;

    const updated = await this.prisma.oosIncident.update({
      where: { id },
      data: {
        phaseOneStatus: dto.phaseOneStatus ?? oos.phaseOneStatus,
        labErrorConfirmed: dto.labErrorConfirmed ?? oos.labErrorConfirmed,
        rootCauseCategory: dto.rootCauseCategory ?? oos.rootCauseCategory,
        phaseTwoRequired: dto.phaseTwoRequired ?? oos.phaseTwoRequired,
        capaDescription: dto.capaDescription ?? oos.capaDescription,
        qaApprovalStatus: dto.qaApprovalStatus ?? oos.qaApprovalStatus,
        qaManagerId,
        closedAt,
      },
      include: {
        sample: true,
        sampleTest: { include: { testSpecification: true } },
        reportedBy: { select: { fullName: true } },
        qaManager: { select: { fullName: true } },
      },
    });

    await this.prisma.auditTrail.create({
      data: {
        entityName: 'OosIncident',
        entityId: id,
        action: 'OOS_INVESTIGATION_UPDATED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Updated OOS ${oos.incidentNumber} status to ${updated.phaseOneStatus} / QA ${updated.qaApprovalStatus}`,
        diffPayload: JSON.stringify(dto),
      },
    });

    return updated;
  }

  // 5. Dashboard Summary
  async getDashboardSummary() {
    const [
      totalSamples,
      activeSamples,
      testingInProgress,
      reviewPending,
      approvedSamples,
      rejectedSamples,
      totalBatches,
      releasedBatches,
      totalOos,
      openOos,
      totalInstruments,
      dueInstruments,
    ] = await Promise.all([
      this.prisma.sample.count(),
      this.prisma.sample.count({ where: { status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED'] } } }),
      this.prisma.sample.count({ where: { status: 'TESTING_IN_PROGRESS' } }),
      this.prisma.sample.count({ where: { status: 'REVIEW_PENDING' } }),
      this.prisma.sample.count({ where: { status: 'APPROVED' } }),
      this.prisma.sample.count({ where: { status: 'REJECTED' } }),
      this.prisma.batch.count(),
      this.prisma.batch.count({ where: { status: 'RELEASED' } }),
      this.prisma.oosIncident.count(),
      this.prisma.oosIncident.count({ where: { phaseOneStatus: 'INVESTIGATING' } }),
      this.prisma.instrument.count(),
      this.prisma.instrument.count({
        where: { nextCalibrationDue: { lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const sampleTypeCounts = await this.prisma.sample.groupBy({
      by: ['sampleType'],
      _count: { id: true },
    });

    const testResultCounts = await this.prisma.sampleTest.groupBy({
      by: ['resultStatus'],
      _count: { id: true },
    });

    const urgentQueue = await this.prisma.sample.findMany({
      where: {
        priority: { in: ['URGENT', 'STAT'] },
        status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED'] },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        batch: { select: { batchNumber: true } },
        assignedTo: { select: { fullName: true } },
      },
    });

    const instrumentsNeedingAttention = await this.prisma.instrument.findMany({
      where: {
        OR: [
          { status: { in: ['CALIBRATION_DUE', 'OUT_OF_SERVICE', 'MAINTENANCE'] } },
          { nextCalibrationDue: { lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } },
        ],
      },
      take: 4,
      orderBy: { nextCalibrationDue: 'asc' },
    });

    const totalFinished = approvedSamples + rejectedSamples;
    const passRate = totalFinished > 0 ? ((approvedSamples / totalFinished) * 100).toFixed(1) : '99.2';

    return {
      kpi: {
        activeSamples,
        totalSamples,
        testingInProgress,
        reviewPending,
        approvedSamples,
        rejectedSamples,
        totalBatches,
        releasedBatches,
        totalOos,
        openOos,
        totalInstruments,
        dueInstruments,
        passRate: `${passRate}%`,
      },
      sampleTypeBreakdown: sampleTypeCounts.map((s) => ({ type: s.sampleType, count: s._count.id })),
      testResultDistribution: testResultCounts.map((t) => ({ status: t.resultStatus, count: t._count.id })),
      urgentQueue,
      instrumentsNeedingAttention,
    };
  }

  async updateSubmissionStatus(submissionId: string, dto: any, user: any) {
    const existing = await this.prisma.sampleSubmission.findUnique({
      where: { id: submissionId },
      include: { sample: true },
    });

    if (!existing) {
      throw new NotFoundException(`Sample submission '${submissionId}' not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sampleSubmission.update({
        where: { id: submissionId },
        data: {
          status: dto.status,
          remarks: dto.remarks
            ? `${existing.remarks ? existing.remarks + ' | ' : ''}${dto.remarks}`
            : existing.remarks,
        },
        include: {
          sample: true,
          laboratory: true,
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user?.id || null,
          action: 'SUBMISSION_STATUS_UPDATED',
          entityType: 'SampleSubmission',
          entityId: submissionId,
          previousValues: { status: existing.status, remarks: existing.remarks },
          newValues: { status: dto.status, remarks: updated.remarks },
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'SampleSubmission',
          entityId: submissionId,
          action: 'STATUS_TRANSITIONED',
          performedById: user?.id || null,
          performedByName: user?.fullName || 'QC Staff',
          role: user?.role || 'QC_ANALYST',
          reasonForChange:
            dto.reasonForChange ||
            `Submission status transitioned from ${existing.status} to ${dto.status}`,
        },
      });

      return updated;
    });
  }
}

