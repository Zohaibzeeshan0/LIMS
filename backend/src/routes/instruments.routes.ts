import { Router } from 'express';
import { laboratoriesController } from '../controllers/laboratories.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => laboratoriesController.findAllInstruments(req, res, next));
router.get('/:id', (req, res, next) => laboratoriesController.findOneInstrument(req, res, next));
router.post('/', requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN), (req, res, next) =>
  laboratoriesController.createInstrument(req, res, next)
);
router.post(
  '/:id/calibration',
  requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN, Role.QC_ANALYST),
  (req, res, next) => laboratoriesController.logCalibration(req, res, next)
);

export default router;
