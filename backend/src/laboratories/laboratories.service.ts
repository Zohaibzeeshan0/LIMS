import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { LogCalibrationDto } from './dto/log-calibration.dto';
import { SampleQueryDto } from '../samples/dto/sample-query.dto';

@Injectable()
export class LaboratoriesService {
  constructor(private prisma: PrismaService) {}

  // List all Laboratories with operational metrics
  async findAllLaboratories() {
    return this.prisma.laboratory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            samples: true,
            sampleSubmissions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Find samples for a specific laboratory
  async findLaboratorySamples(laboratoryId: string, query: SampleQueryDto) {
    const lab = await this.prisma.laboratory.findFirst({
      where: {
        OR: [
          { id: laboratoryId },
          { code: { equals: laboratoryId, mode: 'insensitive' } },
          { name: { contains: laboratoryId, mode: 'insensitive' } },
        ],
      },
    });

    if (!lab) {
      throw new NotFoundException(`Laboratory '${laboratoryId}' not found`);
    }

    const where: any = { laboratoryId: lab.id };

    if (query.status) {
      where.status = query.status;
    }

    if (query.stageType) {
      where.stageType = query.stageType;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { sampleId: { contains: s, mode: 'insensitive' } },
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { recordNumber: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
        { batchLotNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, parseInt((query.page as any) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((query.limit as any) || '10', 10)));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.sample.count({ where }),
      this.prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
          receivedByUser: { select: { id: true, fullName: true, employeeId: true } },
          batch: { select: { id: true, batchNumber: true, drugProduct: true } },
          _count: { select: { tests: true, submissions: true } },
        },
      }),
    ]);

    return {
      laboratory: lab,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Instrument Directory & Calibration health status
  async findAll() {
    const instruments = await this.prisma.instrument.findMany({
      include: {
        calibrationLogs: {
          orderBy: { calibrationDate: 'desc' },
          take: 3,
          include: { calibratedBy: { select: { fullName: true } } },
        },
        _count: { select: { sampleTests: true, calibrationLogs: true } },
      },
      orderBy: { equipmentCode: 'asc' },
    });

    const now = new Date();
    return instruments.map((inst) => {
      const isOverdue = new Date(inst.nextCalibrationDue) < now;
      const isDueSoon =
        !isOverdue &&
        new Date(inst.nextCalibrationDue).getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000;

      let computedStatus = inst.status;
      if (inst.status !== 'OUT_OF_SERVICE' && inst.status !== 'MAINTENANCE') {
        if (isOverdue || isDueSoon) {
          computedStatus = 'CALIBRATION_DUE';
        }
      }

      return {
        ...inst,
        status: computedStatus,
        isOverdue,
        isDueSoon,
      };
    });
  }

  async findOne(id: string) {
    const inst = await this.prisma.instrument.findUnique({
      where: { id },
      include: {
        calibrationLogs: {
          orderBy: { calibrationDate: 'desc' },
          include: { calibratedBy: { select: { fullName: true, employeeId: true } } },
        },
        sampleTests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            sample: { select: { sampleCode: true, materialName: true } },
            testSpecification: { select: { name: true } },
          },
        },
      },
    });

    if (!inst) throw new NotFoundException('Instrument not found');
    return inst;
  }

  async create(dto: CreateInstrumentDto, user: any) {
    const frequency = dto.calibrationFrequencyDays || 90;
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + frequency);

    const instrument = await this.prisma.instrument.create({
      data: {
        equipmentCode: dto.equipmentCode,
        name: dto.name,
        model: dto.model,
        serialNumber: dto.serialNumber,
        manufacturer: dto.manufacturer,
        laboratoryRoom: dto.laboratoryRoom,
        status: dto.status || 'QUALIFIED',
        calibrationFrequencyDays: frequency,
        lastCalibrationDate: new Date(),
        nextCalibrationDue: nextDue,
        remarks: dto.remarks,
      },
    });

    await this.prisma.auditTrail.create({
      data: {
        entityName: 'Instrument',
        entityId: instrument.id,
        action: 'EQUIPMENT_REGISTERED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Registered lab equipment ${instrument.equipmentCode}`,
      },
    });

    return instrument;
  }

  async logCalibration(id: string, dto: LogCalibrationDto, user: any) {
    const instrument = await this.prisma.instrument.findUnique({ where: { id } });
    if (!instrument) throw new NotFoundException('Instrument not found');

    const calibrationDate = new Date();
    const nextDue = new Date(calibrationDate);
    nextDue.setDate(nextDue.getDate() + instrument.calibrationFrequencyDays);

    const passed = dto.passed ?? true;
    const newStatus = passed ? 'QUALIFIED' : 'OUT_OF_SERVICE';

    return this.prisma.$transaction(async (tx) => {
      const log = await tx.calibrationLog.create({
        data: {
          instrumentId: id,
          calibrationDate,
          calibratedById: user.id,
          certificateNumber: dto.certificateNumber,
          standardUsed: dto.standardUsed,
          passed,
          nextDue,
          remarks: dto.remarks,
        },
      });

      const updatedInstrument = await tx.instrument.update({
        where: { id },
        data: {
          lastCalibrationDate: calibrationDate,
          nextCalibrationDue: nextDue,
          status: newStatus as any,
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'Instrument',
          entityId: id,
          action: 'CALIBRATION_LOGGED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: `Recorded calibration certificate ${dto.certificateNumber}. Result: ${passed ? 'PASSED' : 'FAILED'}`,
          diffPayload: JSON.stringify({
            certificateNumber: dto.certificateNumber,
            passed,
            nextCalibrationDue: nextDue.toISOString(),
            status: newStatus,
          }),
        },
      });

      return { log, instrument: updatedInstrument };
    });
  }
}
