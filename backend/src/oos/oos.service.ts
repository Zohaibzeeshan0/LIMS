import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOosDto } from './dto/create-oos.dto';
import { UpdateOosDto } from './dto/update-oos.dto';

@Injectable()
export class OosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.oosIncident.findMany({
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
    const oos = await this.prisma.oosIncident.findUnique({
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

    if (!oos) throw new NotFoundException('OOS Incident record not found');
    return oos;
  }

  async create(dto: CreateOosDto, user: any) {
    const year = new Date().getFullYear();
    const count = await this.prisma.oosIncident.count();
    const incidentNumber = `OOS-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const oos = await this.prisma.oosIncident.create({
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

    await this.prisma.auditTrail.create({
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

  async update(id: string, dto: UpdateOosDto, user: any) {
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
}
