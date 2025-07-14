import { Router } from 'express';
import { asyncHandler } from '@/api/middleware/errorHandler';
import { getRedisClient } from '@/core/redis';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  const { severity, limit = 20 } = req.query;
  
  let alertIds: string[] = [];
  
  if (severity && ['low', 'medium', 'high', 'critical'].includes(severity as string)) {
    alertIds = await redis.lRange(`warnings:${severity}`, 0, parseInt(limit as string) - 1);
  } else {
    const [critical, high, medium, low] = await Promise.all([
      redis.lRange('warnings:critical', 0, 5),
      redis.lRange('warnings:high', 0, 10),
      redis.lRange('warnings:medium', 0, 10),
      redis.lRange('warnings:low', 0, 5),
    ]);
    alertIds = [...critical, ...high, ...medium, ...low].slice(0, parseInt(limit as string));
  }
  
  const alerts = await Promise.all(
    alertIds.map(async (id) => {
      const data = await redis.get(`warning:${id}`);
      return data ? JSON.parse(data) : null;
    })
  );
  
  res.json({
    alerts: alerts.filter(Boolean),
    total: alerts.filter(Boolean).length,
    severity: severity || 'all',
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  const { id } = req.params;
  
  const alertData = await redis.get(`warning:${id}`);
  
  if (!alertData) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  const alert = JSON.parse(alertData);
  
  res.json(alert);
}));

router.post('/:id/acknowledge', asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  const { id } = req.params;
  const { acknowledgedBy } = req.body;
  
  const alertData = await redis.get(`warning:${id}`);
  
  if (!alertData) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  const alert = JSON.parse(alertData);
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = acknowledgedBy || 'unknown';
  
  await redis.setEx(`warning:${id}`, 7 * 24 * 60 * 60, JSON.stringify(alert));
  
  res.json({
    message: 'Alert acknowledged',
    alert,
  });
}));

router.get('/stats/summary', asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  
  const [critical, high, medium, low] = await Promise.all([
    redis.lLen('warnings:critical'),
    redis.lLen('warnings:high'),
    redis.lLen('warnings:medium'),
    redis.lLen('warnings:low'),
  ]);
  
  const total = critical + high + medium + low;
  
  res.json({
    summary: {
      total,
      bySeverity: {
        critical,
        high,
        medium,
        low,
      },
    },
    timestamp: new Date(),
  });
}));

export { router as alertRoutes };