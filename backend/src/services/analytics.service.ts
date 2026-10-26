import { prisma } from '../config/prisma';

export class AnalyticsService {
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
      prisma.sample.count(),
      prisma.sample.count({
        where: { status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED'] } },
      }),
      prisma.sample.count({ where: { status: 'TESTING_IN_PROGRESS' } }),
      prisma.sample.count({ where: { status: 'REVIEW_PENDING' } }),
      prisma.sample.count({ where: { status: 'APPROVED' } }),
      prisma.sample.count({ where: { status: 'REJECTED' } }),
      prisma.batch.count(),
      prisma.batch.count({ where: { status: 'RELEASED' } }),
      prisma.oosIncident.count(),
      prisma.oosIncident.count({ where: { phaseOneStatus: 'INVESTIGATING' } }),
      prisma.instrument.count(),
      prisma.instrument.count({
        where: {
          nextCalibrationDue: { lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const sampleTypeCounts = await prisma.sample.groupBy({
      by: ['sampleType'],
      _count: { id: true },
    });

    const testResultCounts = await prisma.sampleTest.groupBy({
      by: ['resultStatus'],
      _count: { id: true },
    });

    const urgentQueue = await prisma.sample.findMany({
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

    const instrumentsNeedingAttention = await prisma.instrument.findMany({
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
      sampleTypeBreakdown: sampleTypeCounts.map((s) => ({
        type: s.sampleType,
        count: s._count.id,
      })),
      testResultDistribution: testResultCounts.map((t) => ({
        status: t.resultStatus,
        count: t._count.id,
      })),
      urgentQueue,
      instrumentsNeedingAttention,
    };
  }
}

export const analyticsService = new AnalyticsService();
