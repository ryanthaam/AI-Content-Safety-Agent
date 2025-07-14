import { Router } from 'express';
import { contentRoutes } from './content';
import { analysisRoutes } from './analysis';
import { alertRoutes } from './alerts';
import { dashboardRoutes } from './dashboard';
import { authRoutes } from './auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/content', contentRoutes);
router.use('/analysis', analysisRoutes);
router.use('/alerts', alertRoutes);
router.use('/dashboard', dashboardRoutes);

router.get('/docs', (req, res) => {
  res.json({
    name: 'Sentinel AI Content Safety Agent API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      content: '/api/v1/content',
      analysis: '/api/v1/analysis',
      alerts: '/api/v1/alerts',
      dashboard: '/api/v1/dashboard',
    },
    documentation: 'https://docs.sentinel-ai.com',
  });
});

export { router as apiRoutes };