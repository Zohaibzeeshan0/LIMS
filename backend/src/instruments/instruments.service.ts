import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { LogCalibrationDto } from './dto/log-calibration.dto';

@Injectable()
export class InstrumentsService {
  constructor(private prisma: PrismaService) {}

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
    // Auto evaluate status based on nextCalibrationDue
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
        status: (dto.status as any) || 'QUALIFIED',
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
