import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export class OosService {
  async findAll() {
    return prisma.oosIncident.findMany({
      include: {
        sample: {
          select: {
            id: true,
            sampleCode: true,
            materialName: true,
            sampleType: true,
            batch: { select: { batchNumber: true, drugProduct: true } },
          },
        },
        sampleTest: {
          include: {
            testSpecification: true,
            instrument: true,
          },
        },
        reportedBy: { select: { fullName: true, employeeId: true } },
        qaManager: { select: { fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const oos = await prisma.oosIncident.findUnique({
      where: { id },
      include: {
        sample: {
          include: {
            batch: true,
            accessionedBy: { select: { fullName: true } },
          },
        },
        sampleTest: {
          include: {
            testSpecification: true,
            instrument: true,
            analyst: { select: { fullName: true, employeeId: true } },
          },
        },
        reportedBy: { select: { fullName: true, employeeId: true, department: true } },
        qaManager: { select: { fullName: true, employeeId: true, department: true } },
      },
    });

    if (!oos) throw new AppError('OOS Incident record not found', 404);
    return oos;
  }

  async create(dto: any, user: any) {
    const year = new Date().getFullYear();
    const count = await prisma.oosIncident.count();
    const incidentNumber = `OOS-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const oos = await prisma.oosIncident.create({
      data: {
        incidentNumber,
        sampleTestId: dto.sampleTestId,
        sampleId: dto.sampleId,
        reportedById: user.id,
        phaseOneStatus: 'INVESTIGATING',
        rootCauseCategory: dto.rootCauseCategory || 'UNDER_INVESTIGATION',
        capaDescription: dto.capaDescription || 'Initial Phase 1 Laboratory Investigation opened.',
      },
      include: {
        sample: true,
        sampleTest: { include: { testSpecification: true } },
      },
    });

    await prisma.auditTrail.create({
      data: {
        entityName: 'OosIncident',
        entityId: oos.id,
        action: 'OOS_INITIATED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Initiated Out-of-Specification incident ${oos.incidentNumber}`,
      },
    });

    return oos;
  }

  async update(id: string, dto: any, user: any) {
    const oos = await prisma.oosIncident.findUnique({ where: { id } });
    if (!oos) throw new AppError('OOS incident not found', 404);

    const isClosing = dto.qaApprovalStatus === 'APPROVED' || dto.phaseOneStatus === 'CONCLUDED';
    const closedAt = isClosing ? new Date() : oos.closedAt;
    const qaManagerId = dto.qaApprovalStatus ? user.id : oos.qaManagerId;

    const updated = await prisma.oosIncident.update({
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

    await prisma.auditTrail.create({
      data: {
        entityName: 'OosIncident',
        entityId: id,
        action: 'OOS_INVESTIGATION_UPDATED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Updated OOS ${oos.incidentNumber} status to ${updated.phaseOneStatus} / QA ${updated.qaApprovalStatus}`,
      },
    });

    return updated;
  }
}

export const oosService = new OosService();
