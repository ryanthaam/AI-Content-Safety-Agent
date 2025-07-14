import { Router } from 'express';
import { asyncHandler } from '@/api/middleware/errorHandler';
import { TrendAnalysisService } from '@/services/TrendAnalysisService';

const router = Router();
const trendAnalysisService = new TrendAnalysisService();

router.get('/trends', asyncHandler(async (req, res) => {
  const { timeframe = 'day' } = req.query;
  
  const summary = await trendAnalysisService.getTrendingSummary(timeframe as 'hour' | 'day' | 'week');
  
  res.json({
    timeframe,
    summary,
    timestamp: new Date(),
  });
}));

router.post('/trends/analyze', asyncHandler(async (req, res) => {
  const trends = await trendAnalysisService.analyzeCurrentTrends();
  
  res.json({
    message: 'Trend analysis completed',
    trends: trends.slice(0, 10), // Return top 10 trends
    totalTrends: trends.length,
    timestamp: new Date(),
  });
}));

router.get('/trends/summary/:timeframe', asyncHandler(async (req, res) => {
  const { timeframe } = req.params;
  
  if (!['hour', 'day', 'week'].includes(timeframe)) {
    return res.status(400).json({ error: 'Invalid timeframe. Use: hour, day, or week' });
  }

  const summary = await trendAnalysisService.getTrendingSummary(timeframe as 'hour' | 'day' | 'week');
  
  res.json({
    timeframe,
    summary,
    timestamp: new Date(),
  });
}));

export { router as analysisRoutes };