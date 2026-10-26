import { Router } from 'express';
import authRoutes from './auth.routes';
import samplingRoutes from './sampling.routes';
import samplesRoutes from './samples.routes';
import batchesRoutes from './batches.routes';
import testsRoutes from './tests.routes';
import auditRoutes from './audit.routes';
import laboratoriesRoutes from './laboratories.routes';
import instrumentsRoutes from './instruments.routes';
import categoriesRoutes from './categories.routes';
import oosRoutes from './oos.routes';
import usersRoutes from './users.routes';
import submissionsRoutes from './submissions.routes';
import analyticsRoutes from './analytics.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/sampling', samplingRoutes);
apiRouter.use('/samples', samplesRoutes);
apiRouter.use('/batches', batchesRoutes);
apiRouter.use('/tests', testsRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/laboratories', laboratoriesRoutes);
apiRouter.use('/instruments', instrumentsRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/oos', oosRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/submissions', submissionsRoutes);
apiRouter.use('/analytics', analyticsRoutes);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'City Pharma LIMS API (Node.js + Express)',
  });
});

export default apiRouter;
