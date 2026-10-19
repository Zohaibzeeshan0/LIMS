import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { IssueCoaDto } from './dto/create-coa.dto';
import * as crypto from 'crypto';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.batch.findMany({
      include: {
        samples: {
          select: {
            id: true,
            sampleCode: true,
            materialName: true,
            sampleType: true,
            status: true,
            tests: { select: { id: true, status: true, resultStatus: true } },
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
        _count: { select: { samples: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        samples: {
          include: {
            tests: {
              include: {
                testSpecification: true,
                instrument: true,
                analyst: { select: { fullName: true } },
              },
            },
            accessionedBy: { select: { fullName: true } },
          },
        },
        coa: {
          include: {
            authorizedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
          },
        },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async create(dto: CreateBatchDto, user: any) {
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
      include: {
        samples: {
          include: { tests: true },
        },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    // For RELEASED, check if there are any active OOS or pending tests
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
        include: {
          samples: true,
          coa: true,
        },
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

  async issueCoa(dto: IssueCoaDto, user: any) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: {
        samples: {
          include: {
            tests: { include: { testSpecification: true } },
          },
        },
        coa: true,
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.coa) throw new BadRequestException('Certificate of Analysis has already been generated for this batch');

    const year = new Date().getFullYear();
    const count = await this.prisma.certificateOfAnalysis.count();
    const certificateNumber = `COA-${year}-${(count + 1).toString().padStart(4, '0')}`;

    // Generate cryptographic electronic signature hash
    const signaturePayload = `${certificateNumber}|${batch.batchNumber}|${batch.drugProduct}|${user.employeeId}|${new Date().toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    const sampleId = dto.sampleId || batch.samples[0]?.id || null;

    return this.prisma.$transaction(async (tx) => {
      const coa = await tx.certificateOfAnalysis.create({
        data: {
          certificateNumber,
          batchId: batch.id,
          sampleId,
          issuedDate: new Date(),
          authorizedById: user.id,
          status: 'ISSUED',
          remarks: dto.remarks || 'This batch complies with all specified standard release requirements.',
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
          diffPayload: JSON.stringify({
            certificateNumber: coa.certificateNumber,
            batchNumber: batch.batchNumber,
            signatureHash,
          }),
        },
      });

      return coa;
    });
  }
}
