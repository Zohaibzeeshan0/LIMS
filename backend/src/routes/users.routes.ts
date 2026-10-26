import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => usersController.findAll(req, res, next));
router.get('/:id', (req, res, next) => usersController.findOne(req, res, next));

export default router;
