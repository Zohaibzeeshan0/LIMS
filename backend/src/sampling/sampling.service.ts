import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { SubmissionDestination, SubmissionStatus } from '@prisma/client';
import { SubmitSampleDto, UpdateSubmissionStatusDto } from './dto/submit-sample.dto';

@Injectable()
export class SamplingService {
  constructor(private prisma: PrismaService) {}

  async generateSampleCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.sample.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `SMP-${year}-${sequence}`;
  }

  async generateAccessionNo(): Promise<string> {
    const count = await this.prisma.sample.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `A-${sequence}`;
  }

  async checkSampleIdAvailability(sampleCode: string) {
    const existing = await this.prisma.sample.findUnique({
      where: { sampleCode: sampleCode.trim() },
      select: { id: true, sampleCode: true, materialName: true, accessionNo: true },
    });
    return {
      sampleCode,
      isAvailable: !existing,
      existingSample: existing || null,
    };
  }

  async create(createSampleDto: CreateSampleDto, user: any) {
    let sampleCode = createSampleDto.sampleCode?.trim();
    if (sampleCode) {
      const existing = await this.prisma.sample.findUnique({
        where: { sampleCode },
      });
      if (existing) {
        throw new ConflictException(
          `Sample ID '${sampleCode}' already exists in registry (Accession No: ${existing.accessionNo}). Please specify a unique ID or use auto-generation.`
        );
      }
    } else {
      sampleCode = await this.generateSampleCode();
    }

    const mfgDate = createSampleDto.mfgDate ? new Date(createSampleDto.mfgDate) : null;
    const expDate = createSampleDto.expDate ? new Date(createSampleDto.expDate) : null;

    if (mfgDate && expDate && expDate < mfgDate) {
      throw new BadRequestException('Validation Failed: Expiry Date cannot be earlier than Manufacturing Date.');
    }

    if (createSampleDto.sampleQty <= 0) {
      throw new BadRequestException('Validation Failed: Sample Quantity must be a positive number greater than 0.');
    }

    const barcode = `CP-${sampleCode}`;
    const accessionNo = createSampleDto.accessionNo || (await this.generateAccessionNo());
    const samplingDate = createSampleDto.samplingDate ? new Date(createSampleDto.samplingDate) : new Date();

    const stageTypeVal = (createSampleDto.stageType || createSampleDto.sampleType || 'Finished Product').toString().trim();
    const validEnum = ['RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'WATER_PURIFIED', 'ENVIRONMENTAL_SWAB'].includes(stageTypeVal)
      ? (stageTypeVal as any)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const sample = await tx.sample.create({
        data: {
          accessionNo,
          sampleCode,
          recordNumber: accessionNo,
          sampleId: sampleCode,
          barcode,
          samplingDate,
          sampledAt: samplingDate,
          materialName: createSampleDto.materialName || createSampleDto.nomenclature || 'Unnamed Material',
          nomenclature: createSampleDto.nomenclature || createSampleDto.materialName || 'Unnamed Material',
          lotNumber: createSampleDto.lotNumber || null,
          batchLotNumber: createSampleDto.lotNumber || null,
          mfgDate,
          manufacturingDate: mfgDate,
          expDate,
          expiryDate: expDate,
          submittedBy: createSampleDto.submittedBy || user.fullName,
          stageType: stageTypeVal,
          sampleType: validEnum,
          batchId: createSampleDto.batchId || null,
          sourceSupplier: createSampleDto.sourceSupplier,
          samplingLocation: createSampleDto.samplingLocation || 'Laboratory Receiving Bay',
          sampleQty: createSampleDto.sampleQty,
          quantity: createSampleDto.sampleQty,
          unit: createSampleDto.unit,
          storageCondition: createSampleDto.storageCondition || 'Controlled Room Temp 20-25°C',
          priority: createSampleDto.priority || 'ROUTINE',
          laboratoryType: ((createSampleDto.laboratory as string)?.toUpperCase() === 'SEF' ? 'SAF' : (createSampleDto.laboratory as any)) || 'GENERAL',
          status: 'RECEIVED',
          chainOfCustody: createSampleDto.chainOfCustody || `Sample logged by ${user.fullName} (${user.employeeId})`,
          remarks: createSampleDto.remarks,
          accessionedById: user.id,
          assignedToId: createSampleDto.assignedToId || null,
        },
      });

      if (createSampleDto.testSpecificationIds && createSampleDto.testSpecificationIds.length > 0) {
        const specs = await tx.testSpecification.findMany({
          where: { id: { in: createSampleDto.testSpecificationIds } },
        });

        for (const spec of specs) {
          await tx.sampleTest.create({
            data: {
              sampleId: sample.id,
              testSpecificationId: spec.id,
              minLimit: spec.defaultMinLimit,
              maxLimit: spec.defaultMaxLimit,
              targetValue: spec.defaultTarget,
              unit: spec.unit,
              status: 'PENDING',
              resultStatus: 'NOT_TESTED',
              analystId: createSampleDto.assignedToId || null,
            },
          });
        }
      }

      const isUrgentPriority = sample.priority === 'STAT' || sample.priority === 'URGENT';
      const slaTurnaround =
        sample.priority === 'STAT'
          ? '24 Hours SLA'
          : sample.priority === 'URGENT'
          ? '2 Days SLA'
          : '5 Days SLA';

      const priorityAction =
        sample.priority === 'STAT'
          ? 'CRITICAL_IMMEDIATE_SAMPLE'
          : sample.priority === 'URGENT'
          ? 'URGENT_PRIORITY_SAMPLE'
          : 'SAMPLE_ACCESSIONED';

      const priorityReason = isUrgentPriority
        ? `[PRIORITY NOTICE: ${slaTurnaround}] Sample flagged with ${sample.priority} testing window`
        : 'Sample accession and initial intake';

      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: sample.id,
          action: priorityAction,
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: priorityReason,
          diffPayload: JSON.stringify({
            accessionNo,
            sampleCode,
            materialName: sample.materialName,
            nomenclature: sample.nomenclature,
            lotNumber: sample.lotNumber,
            sampleType: sample.sampleType,
            priority: sample.priority,
            sla: slaTurnaround,
            laboratory: sample.laboratoryType,
            qty: `${sample.sampleQty} ${sample.unit}`,
          }),
        },
      });

      return tx.sample.findUnique({
        where: { id: sample.id },
        include: {
          batch: true,
          accessionedBy: { select: { id: true, fullName: true, employeeId: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
          tests: {
            include: {
              testSpecification: true,
              instrument: true,
              analyst: { select: { id: true, fullName: true } },
            },
          },
        },
      });
    });
  }

  async findAll(query: any) {
    const where: any = {};
    if (query.status) {
      if (typeof query.status === 'string' && query.status.includes(',')) {
        const statuses = query.status.split(',').map((s: string) => s.trim()).filter(Boolean);
        where.status = { in: statuses };
      } else {
        where.status = query.status;
      }
    }
    if (query.sampleType || query.stage || query.stageType) {
      const s = (query.stageType || query.stage || query.sampleType)?.trim();
      if (s) {
        where.stageType = { contains: s, mode: 'insensitive' };
      }
    }
    if (query.priority) {
      if (typeof query.priority === 'string' && query.priority.includes(',')) {
        const priorities = query.priority.split(',').map((p: string) => p.trim()).filter(Boolean);
        where.priority = { in: priorities };
      } else {
        where.priority = query.priority;
      }
    }
    if (query.batchId) where.batchId = query.batchId;

    const rawLab = query.laboratory || query.lab;
    const lab = rawLab ? (rawLab.toString().toUpperCase() === 'SEF' ? 'SAF' : rawLab.toString().toUpperCase()) : undefined;
    if (lab && ['SAF', 'PENICILLIN', 'GENERAL'].includes(lab)) {
      where.laboratoryType = lab as any;
    }

    // Specific searches
    if (query.sampleId) {
      where.sampleCode = { contains: query.sampleId.trim(), mode: 'insensitive' };
    }

    if (query.nomenclature) {
      where.OR = [
        { nomenclature: { contains: query.nomenclature.trim(), mode: 'insensitive' } },
        { materialName: { contains: query.nomenclature.trim(), mode: 'insensitive' } },
      ];
    }

    if (query.batchNumber) {
      const bTerm = query.batchNumber.trim();
      const batchCond = [
        { lotNumber: { contains: bTerm, mode: 'insensitive' } },
        { batch: { batchNumber: { contains: bTerm, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: batchCond }];
        delete where.OR;
      } else {
        where.OR = batchCond;
      }
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.samplingDate = dateFilter;
    }

    // General multi-field search
    if (query.search) {
      const s = query.search.trim();
      const searchConditions = [
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
        { materialName: { contains: s, mode: 'insensitive' } },
        { lotNumber: { contains: s, mode: 'insensitive' } },
        { submittedBy: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
        { sourceSupplier: { contains: s, mode: 'insensitive' } },
        { batch: { batchNumber: { contains: s, mode: 'insensitive' } } },
      ];

      if (where.AND) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Sorting
    const allowedSortFields = [
      'accessionNo',
      'samplingDate',
      'nomenclature',
      'sampleCode',
      'sampleType',
      'sampleQty',
      'lotNumber',
      'mfgDate',
      'expDate',
      'submittedBy',
      'createdAt',
      'status',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'samplingDate';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const orderBy: any = { [sortBy]: sortOrder };

    // Pagination
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.sample.count({ where }),
      this.prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          batch: { select: { id: true, batchNumber: true, drugProduct: true, status: true } },
          laboratory: { select: { id: true, name: true, code: true } },
          accessionedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true, department: true } },
          tests: {
            select: {
              id: true,
              status: true,
              resultStatus: true,
              testSpecification: { select: { name: true, testCode: true } },
            },
          },
          submissions: {
            select: {
              id: true,
              destinationLaboratory: true,
              status: true,
              submittedByName: true,
              submissionDate: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { tests: true, oosIncidents: true, submissions: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(idOrCode: string) {
    const sample = await this.prisma.sample.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { sampleCode: idOrCode },
          { sampleId: idOrCode },
          { accessionNo: idOrCode },
          { barcode: idOrCode },
        ],
      },
      include: {
        batch: true,
        laboratory: true,
        accessionedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
        assignedTo: { select: { id: true, fullName: true, employeeId: true, department: true } },
        tests: {
          include: {
            testSpecification: true,
            instrument: true,
            analyst: { select: { id: true, fullName: true, employeeId: true } },
            oosIncidents: true,
          },
        },
        oosIncidents: {
          include: {
            reportedBy: { select: { id: true, fullName: true } },
            qaManager: { select: { id: true, fullName: true } },
          },
        },
        submissions: {
          include: {
            submittedByUser: { select: { id: true, fullName: true, employeeId: true, department: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException(`Sample with identifier '${idOrCode}' not found`);
    }

    return sample;
  }

  async update(id: string, updateSampleDto: UpdateSampleDto, user: any) {
    const existing = await this.prisma.sample.findFirst({
      where: {
        OR: [
          { id },
          { sampleCode: id },
          { sampleId: id },
          { accessionNo: id },
        ],
      },
    });
    if (!existing) {
      throw new NotFoundException(`Sample with ID or code ${id} not found`);
    }

    const { reasonForChange, ...updateData } = updateSampleDto;

    return this.prisma.$transaction(async (tx) => {
      let chainOfCustodyUpdate = existing.chainOfCustody;
      if (updateData.status && updateData.status !== existing.status) {
        chainOfCustodyUpdate = `${existing.chainOfCustody || ''}\n[${new Date().toISOString()}] Status transitioned to ${updateData.status} by ${user.fullName}`;
      }

      const parsedUpdateData: any = { ...updateData };
      if ('mfgDate' in updateData) {
        parsedUpdateData.mfgDate = updateData.mfgDate ? new Date(updateData.mfgDate) : null;
      }
      if ('expDate' in updateData) {
        parsedUpdateData.expDate = updateData.expDate ? new Date(updateData.expDate) : null;
      }
      if (updateData.stageType || updateData.sampleType) {
        const stageVal = (updateData.stageType || updateData.sampleType)!.toString().trim();
        parsedUpdateData.stageType = stageVal;
        parsedUpdateData.sampleType = ['RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'WATER_PURIFIED', 'ENVIRONMENTAL_SWAB'].includes(stageVal)
          ? (stageVal as any)
          : null;
      }

      const updated = await tx.sample.update({
        where: { id: existing.id },
        data: {
          ...parsedUpdateData,
          chainOfCustody: updateData.chainOfCustody || chainOfCustodyUpdate,
        },
        include: {
          batch: true,
          accessionedBy: { select: { id: true, fullName: true, employeeId: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
          tests: {
            include: {
              testSpecification: true,
              instrument: true,
              analyst: { select: { id: true, fullName: true } },
            },
          },
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: id,
          action: 'SAMPLE_UPDATED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: reasonForChange || 'Sample attributes updated via Sampling Records Portal',
          diffPayload: JSON.stringify({
            previous: {
              nomenclature: existing.nomenclature,
              lotNumber: existing.lotNumber,
              sampleQty: existing.sampleQty,
              status: existing.status,
              submittedBy: existing.submittedBy,
              assignedToId: existing.assignedToId,
            },
            updated: {
              nomenclature: updated.nomenclature,
              lotNumber: updated.lotNumber,
              sampleQty: updated.sampleQty,
              status: updated.status,
              submittedBy: updated.submittedBy,
              assignedToId: updated.assignedToId,
            },
          }),
        },
      });

      return updated;
    });
  }

  async getSampleMetrics(laboratory?: string) {
    const rawLab = laboratory?.toUpperCase();
    const normalizedLab = rawLab === 'SEF' ? 'SAF' : rawLab;
    const labCondition =
      normalizedLab && ['SAF', 'PENICILLIN', 'GENERAL'].includes(normalizedLab)
        ? { laboratoryType: normalizedLab as any }
        : {};

    const total = await this.prisma.sample.count({ where: { ...labCondition } });
    const received = await this.prisma.sample.count({ where: { status: 'RECEIVED', ...labCondition } });
    const inTesting = await this.prisma.sample.count({ where: { status: 'TESTING_IN_PROGRESS', ...labCondition } });
    const reviewPending = await this.prisma.sample.count({ where: { status: 'REVIEW_PENDING', ...labCondition } });
    const approved = await this.prisma.sample.count({ where: { status: 'APPROVED', ...labCondition } });
    const rejected = await this.prisma.sample.count({ where: { status: 'REJECTED', ...labCondition } });
    const urgentCount = await this.prisma.sample.count({
      where: {
        priority: { in: ['URGENT', 'STAT'] },
        status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED'] },
        ...labCondition,
      },
    });

    const safCount = await this.prisma.sample.count({ where: { laboratoryType: 'SAF' } });
    const penicillinCount = await this.prisma.sample.count({ where: { laboratoryType: 'PENICILLIN' } });
    const generalCount = await this.prisma.sample.count({ where: { laboratoryType: 'GENERAL' } });

    return {
      total,
      received,
      inTesting,
      reviewPending,
      approved,
      rejected,
      urgentCount,
      byLab: {
        saf: safCount,
        sef: safCount,
        penicillin: penicillinCount,
        general: generalCount,
      },
    };
  }

  async submitToWorkflow(sampleId: string, dto: SubmitSampleDto, user: any) {
    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      include: { batch: true },
    });
    if (!sample) {
      throw new NotFoundException(`Sample with ID ${sampleId} not found`);
    }

    // Prevent accidental duplicate submissions to the same destination lab while active
    const activeExisting = await this.prisma.sampleSubmission.findFirst({
      where: {
        sampleId,
        destinationLaboratory: dto.destinationLab,
        status: {
          in: [
            SubmissionStatus.DRAFT,
            SubmissionStatus.REGISTERED,
            SubmissionStatus.SUBMITTED,
            SubmissionStatus.RECEIVED,
            SubmissionStatus.IN_PROGRESS,
          ],
        },
      },
    });

    if (activeExisting) {
      throw new ConflictException(
        `Sample '${sample.sampleCode}' already has an active workflow submission to ${dto.destinationLab} Laboratory in status '${activeExisting.status}'. Duplicate submissions are prevented.`
      );
    }

    const initialStatus = dto.status || SubmissionStatus.SUBMITTED;

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.sampleSubmission.create({
        data: {
          sampleId,
          destinationLaboratory: dto.destinationLab || 'General Lab',
          destinationLabEnum: dto.destinationLab as any,
          submittedByUserId: user.id,
          submittedByName: `${user.fullName} (${user.employeeId})`,
          submissionDate: new Date(),
          status: initialStatus,
          remarks: dto.remarks || null,
        },
        include: {
          sample: {
            select: {
              id: true,
              sampleCode: true,
              accessionNo: true,
              materialName: true,
              nomenclature: true,
              laboratory: true,
              status: true,
            },
          },
          submittedByUser: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              department: true,
            },
          },
        },
      });

      // Update sample custody trail
      const custodyNote = `\n[${new Date().toISOString()}] Sample submitted to ${dto.destinationLab} Lab by ${user.fullName} (${user.employeeId}) - Status: ${initialStatus}${dto.remarks ? ` [Remarks: ${dto.remarks}]` : ''}`;
      await tx.sample.update({
        where: { id: sampleId },
        data: {
          chainOfCustody: `${sample.chainOfCustody || ''}${custodyNote}`,
          status: sample.status === 'RECEIVED' ? 'ASSIGNED' : sample.status,
        },
      });

      // Record 21 CFR Part 11 Audit Trail
      await tx.auditTrail.create({
        data: {
          entityName: 'SampleSubmission',
          entityId: submission.id,
          action: 'SAMPLE_SUBMITTED_TO_WORKFLOW',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: dto.remarks || `Sample workflow intake routed to ${dto.destinationLab} Laboratory`,
          diffPayload: JSON.stringify({
            sampleCode: sample.sampleCode,
            accessionNo: sample.accessionNo,
            destinationLab: dto.destinationLab,
            status: initialStatus,
            submittedByName: submission.submittedByName,
          }),
        },
      });

      return submission;
    });
  }

  async getSampleSubmissions(sampleId: string) {
    return this.prisma.sampleSubmission.findMany({
      where: { sampleId },
      include: {
        submittedByUser: {
          select: { id: true, fullName: true, employeeId: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllSubmissions(query?: any) {
    const where: any = {};
    if (query?.destinationLab) where.destinationLaboratory = query.destinationLab;
    if (query?.status) where.status = query.status;
    if (query?.sampleId) where.sampleId = query.sampleId;

    return this.prisma.sampleSubmission.findMany({
      where,
      include: {
        sample: {
          select: {
            id: true,
            sampleCode: true,
            accessionNo: true,
            nomenclature: true,
            materialName: true,
            sampleType: true,
            sampleQty: true,
            unit: true,
            laboratory: true,
            status: true,
          },
        },
        submittedByUser: {
          select: { id: true, fullName: true, employeeId: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSubmissionStatus(submissionId: string, dto: UpdateSubmissionStatusDto, user: any) {
    const existing = await this.prisma.sampleSubmission.findUnique({
      where: { id: submissionId },
      include: { sample: true },
    });
    if (!existing) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Valid status transitions
    const VALID_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
      DRAFT: [SubmissionStatus.REGISTERED, SubmissionStatus.SUBMITTED, SubmissionStatus.CANCELLED],
      REGISTERED: [SubmissionStatus.SUBMITTED, SubmissionStatus.CANCELLED],
      SUBMITTED: [SubmissionStatus.RECEIVED, SubmissionStatus.REJECTED, SubmissionStatus.CANCELLED],
      RECEIVED: [SubmissionStatus.IN_PROGRESS, SubmissionStatus.REJECTED],
      IN_PROGRESS: [SubmissionStatus.COMPLETED, SubmissionStatus.REJECTED],
      COMPLETED: [],
      REJECTED: [SubmissionStatus.SUBMITTED], // QA re-submission
      CANCELLED: [],
    };

    const allowedNext = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from '${existing.status}' to '${dto.status}'. Allowed transitions: ${
          allowedNext.join(', ') || 'None (Terminal status)'
        }.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sampleSubmission.update({
        where: { id: submissionId },
        data: {
          status: dto.status,
          remarks: dto.remarks ? `${existing.remarks ? `${existing.remarks}\n` : ''}${dto.remarks}` : existing.remarks,
        },
        include: {
          sample: true,
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
        },
      });

      // Update sample custody trail
      const statusNote = `\n[${new Date().toISOString()}] Workflow submission to ${existing.destinationLaboratory} Lab transitioned from ${existing.status} to ${dto.status} by ${user.fullName} (${user.role})${dto.reasonForChange ? ` [Reason: ${dto.reasonForChange}]` : ''}`;
      await tx.sample.update({
        where: { id: existing.sampleId },
        data: {
          chainOfCustody: `${existing.sample.chainOfCustody || ''}${statusNote}`,
        },
      });

      // Record 21 CFR Part 11 Audit Trail
      await tx.auditTrail.create({
        data: {
          entityName: 'SampleSubmission',
          entityId: submissionId,
          action: 'SUBMISSION_STATUS_UPDATED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: dto.reasonForChange || `Submission status transitioned to ${dto.status}`,
          diffPayload: JSON.stringify({
            previousStatus: existing.status,
            newStatus: dto.status,
            destinationLab: existing.destinationLaboratory,
            sampleCode: existing.sample.sampleCode,
          }),
        },
      });

      return updated;
    });
  }
}
