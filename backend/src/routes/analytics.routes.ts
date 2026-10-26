import { Router } from 'express';
import { analyticsService } from '../services/analytics.service';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', async (req, res, next) => {
  try {
    const result = await analyticsService.getDashboardSummary();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
