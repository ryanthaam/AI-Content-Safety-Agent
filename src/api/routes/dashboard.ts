import { Router } from 'express';
import { asyncHandler } from '@/api/middleware/errorHandler';
import { Content } from '@/models/Content';
import { TrendAnalysisService } from '@/services/TrendAnalysisService';
import { ContentDetectionService } from '@/services/ContentDetectionService';
import { AutomatedResponseService } from '@/services/AutomatedResponseService';
import { getRedisClient } from '@/core/redis';

const router = Router();
const trendAnalysisService = new TrendAnalysisService();
const contentDetectionService = new ContentDetectionService();
const automatedResponseService = new AutomatedResponseService();

router.get('/overview', asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  const { timeframe = '24h' } = req.query;
  
  const hoursBack = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 168; // 7 days
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const [
    totalContent,
    flaggedContent,
    contentByPlatform,
    detectionStats,
    trendingSummary,
    queueStats,
    alertStats,
  ] = await Promise.all([
    Content.countDocuments({
      collectedAt: { $gte: startTime },
    }),
    Content.countDocuments({
      collectedAt: { $gte: startTime },
      'analysisResults.flagged': true,
    }),
    Content.aggregate([
      { $match: { collectedAt: { $gte: startTime } } },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
    ]),
    contentDetectionService.getDetectionStats({ start: startTime, end: new Date() }),
    trendAnalysisService.getTrendingSummary('day'),
    automatedResponseService.getQueueStats(),
    Promise.all([
      redis.lLen('warnings:critical'),
      redis.lLen('warnings:high'),
      redis.lLen('warnings:medium'),
      redis.lLen('warnings:low'),
    ]).then(([critical, high, medium, low]) => ({
      critical, high, medium, low, total: critical + high + medium + low
    })),
  ]);

  const flaggedRate = totalContent > 0 ? (flaggedContent / totalContent * 100).toFixed(2) : '0.00';

  res.json({
    overview: {
      timeframe,
      totalContent,
      flaggedContent,
      flaggedRate: `${flaggedRate}%`,
      platforms: contentByPlatform.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
    },
    detection: detectionStats,
    trends: trendingSummary,
    queues: queueStats,
    alerts: alertStats,
    timestamp: new Date(),
  });
}));

router.get('/metrics', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const metrics = await Content.aggregate([
    {
      $match: {
        collectedAt: { $gte: start, $lte: end },
        processingStatus: 'completed',
      },
    },
    {
      $group: {
        _id: {
          platform: '$platform',
          hour: { $hour: '$collectedAt' },
          date: { $dateToString: { format: '%Y-%m-%d', date: '$collectedAt' } },
        },
        totalContent: { $sum: 1 },
        flaggedContent: {
          $sum: { $cond: [{ $eq: ['$analysisResults.flagged', true] }, 1, 0] },
        },
        avgHarmfulnessScore: { $avg: '$analysisResults.harmfulnessScore' },
        categories: { $addToSet: '$analysisResults.categories' },
      },
    },
    {
      $sort: { '_id.date': 1, '_id.hour': 1 },
    },
  ]);

  res.json({
    timeframe: { start, end },
    metrics,
    summary: {
      totalDataPoints: metrics.length,
      platformsCovered: [...new Set(metrics.map(m => m._id.platform))],
    },
  });
}));

router.get('/realtime', asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
  
  const [
    recentContent,
    recentFlags,
    activeQueues,
    recentAlerts,
  ] = await Promise.all([
    Content.countDocuments({
      collectedAt: { $gte: last5Minutes },
    }),
    Content.countDocuments({
      collectedAt: { $gte: last5Minutes },
      'analysisResults.flagged': true,
    }),
    automatedResponseService.getQueueStats(),
    redis.lRange('warnings:active', 0, 4).then(async (alertIds) => {
      const alerts = await Promise.all(
        alertIds.map(async (id) => {
          const data = await redis.get(`warning:${id}`);
          return data ? JSON.parse(data) : null;
        })
      );
      return alerts.filter(Boolean);
    }),
  ]);

  res.json({
    realtime: {
      last5Minutes: {
        newContent: recentContent,
        newFlags: recentFlags,
        flagRate: recentContent > 0 ? ((recentFlags / recentContent) * 100).toFixed(1) : '0.0',
      },
      queues: activeQueues,
      recentAlerts: recentAlerts.slice(0, 5),
    },
    timestamp: new Date(),
  });
}));

router.get('/platforms/:platform', asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { hours = 24 } = req.query;
  
  const startTime = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);
  
  const [
    totalContent,
    flaggedContent,
    topCategories,
    engagementStats,
    hourlyBreakdown,
  ] = await Promise.all([
    Content.countDocuments({
      platform,
      collectedAt: { $gte: startTime },
    }),
    Content.countDocuments({
      platform,
      collectedAt: { $gte: startTime },
      'analysisResults.flagged': true,
    }),
    Content.aggregate([
      {
        $match: {
          platform,
          collectedAt: { $gte: startTime },
          'analysisResults.flagged': true,
        },
      },
      { $unwind: '$analysisResults.categories' },
      {
        $group: {
          _id: '$analysisResults.categories',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Content.aggregate([
      {
        $match: {
          platform,
          collectedAt: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: null,
          avgLikes: { $avg: '$engagement.likes' },
          avgShares: { $avg: '$engagement.shares' },
          avgComments: { $avg: '$engagement.comments' },
          totalViews: { $sum: '$engagement.views' },
        },
      },
    ]),
    Content.aggregate([
      {
        $match: {
          platform,
          collectedAt: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: { $hour: '$collectedAt' },
          total: { $sum: 1 },
          flagged: {
            $sum: { $cond: [{ $eq: ['$analysisResults.flagged', true] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id': 1 } },
    ]),
  ]);

  res.json({
    platform,
    timeframe: `${hours}h`,
    summary: {
      totalContent,
      flaggedContent,
      flaggedRate: totalContent > 0 ? ((flaggedContent / totalContent) * 100).toFixed(2) : '0.00',
    },
    topCategories: topCategories.map(cat => ({ category: cat._id, count: cat.count })),
    engagement: engagementStats[0] || {},
    hourlyBreakdown,
    timestamp: new Date(),
  });
}));

export { router as dashboardRoutes };