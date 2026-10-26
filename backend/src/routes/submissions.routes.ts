import { Router } from 'express';
import { testsService } from '../services/tests.service';
import { batchesService } from '../services/batches.service';
import { oosService } from '../services/oos.service';
import { samplingService } from '../services/sampling.service';
import { prisma } from '../config/prisma';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Analytical Worksheets
router.get('/worksheets', async (req, res, next) => {
  try {
    const tests = await prisma.sampleTest.findMany({
      include: {
        sample: { select: { id: true, sampleCode: true, materialName: true, priority: true, batch: { select: { batchNumber: true } } } },
        testSpecification: true,
        instrument: true,
        analyst: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tests);
  } catch (err) {
    next(err);
  }
});

router.patch('/worksheets/:id/record-result', async (req, res, next) => {
  try {
    const result = await testsService.recordResult(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/worksheets/:id/verify', async (req, res, next) => {
  try {
    const result = await testsService.verifyTest(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Batches
router.get('/batches', async (req, res, next) => {
  try {
    const result = await batchesService.findAll();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/batches', async (req, res, next) => {
  try {
    const result = await batchesService.create(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/batches/:id/release', async (req, res, next) => {
  try {
    const { decision, notes } = req.body;
    const result = await batchesService.releaseBatch(req.params.id, decision, notes, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/batches/:id/coa', async (req, res, next) => {
  try {
    const result = await batchesService.issueCoa({ batchId: req.params.id }, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// OOS
router.get('/oos', async (req, res, next) => {
  try {
    const result = await oosService.findAll();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/oos/:id', async (req, res, next) => {
  try {
    const result = await oosService.update(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Analytics Dashboard Summary
router.get('/analytics/dashboard', async (req, res, next) => {
  try {
    const metrics = await samplingService.getSampleMetrics(undefined, req.user);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

export default router;
