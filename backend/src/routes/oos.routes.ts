import { Router } from 'express';
import { oosController } from '../controllers/oos.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => oosController.findAll(req, res, next));
router.get('/:id', (req, res, next) => oosController.findOne(req, res, next));
router.post('/', requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST), (req, res, next) =>
  oosController.create(req, res, next)
);
router.patch('/:id', requireRoles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST), (req, res, next) =>
  oosController.update(req, res, next)
);

export default router;
