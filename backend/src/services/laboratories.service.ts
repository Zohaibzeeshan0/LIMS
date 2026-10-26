import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export class LaboratoriesService {
  async findAllLaboratories() {
    return prisma.laboratory.findMany({
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

  async findLaboratorySamples(laboratoryId: string, query: any) {
    const lab = await prisma.laboratory.findFirst({
      where: {
        OR: [
          { id: laboratoryId },
          { code: { equals: laboratoryId, mode: 'insensitive' } },
          { name: { contains: laboratoryId, mode: 'insensitive' } },
        ],
      },
    });

    if (!lab) {
      throw new AppError(`Laboratory '${laboratoryId}' not found`, 404);
    }

    const where: any = { laboratoryId: lab.id };

    if (query.status) where.status = query.status;
    if (query.stageType) where.stageType = query.stageType;
    if (query.priority) where.priority = query.priority;

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { sampleId: { contains: s, mode: 'insensitive' } },
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { recordNumber: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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

  async findAll() {
    const instruments = await prisma.instrument.findMany({
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
    const inst = await prisma.instrument.findUnique({
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

    if (!inst) throw new AppError('Instrument not found', 404);
    return inst;
  }

  async create(dto: any, user: any) {
    const frequency = dto.calibrationFrequencyDays || 90;
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + frequency);

    const instrument = await prisma.instrument.create({
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

    await prisma.auditTrail.create({
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

  async logCalibration(id: string, dto: any, user: any) {
    const instrument = await prisma.instrument.findUnique({ where: { id } });
    if (!instrument) throw new AppError('Instrument not found', 404);

    const calibrationDate = new Date();
    const nextDue = new Date(calibrationDate);
    nextDue.setDate(nextDue.getDate() + instrument.calibrationFrequencyDays);

    const passed = dto.passed ?? true;
    const newStatus = passed ? 'QUALIFIED' : 'OUT_OF_SERVICE';

    return prisma.$transaction(async (tx) => {
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
        },
      });

      return { log, instrument: updatedInstrument };
    });
  }
}

export const laboratoriesService = new LaboratoriesService();
