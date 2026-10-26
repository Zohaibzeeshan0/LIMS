import { Router } from 'express';
import { categoriesController } from '../controllers/categories.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/roles.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => categoriesController.findAll(req, res, next));
router.post('/', requireRoles(Role.ADMIN, Role.QA_MANAGER), (req, res, next) =>
  categoriesController.create(req, res, next)
);

export default router;
