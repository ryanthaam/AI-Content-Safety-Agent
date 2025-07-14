import { Router } from 'express';
import { asyncHandler } from '@/api/middleware/errorHandler';
import { Content } from '@/models/Content';
import { ContentDetectionService } from '@/services/ContentDetectionService';
import { ContentIngestionService } from '@/services/ContentIngestionService';

const router = Router();
const contentDetectionService = new ContentDetectionService();
const contentIngestionService = new ContentIngestionService();

router.get('/', asyncHandler(async (req, res) => {
  const { platform, flagged, limit = 20, offset = 0 } = req.query;
  
  const query: any = {};
  if (platform) query.platform = platform;
  if (flagged !== undefined) query['analysisResults.flagged'] = flagged === 'true';

  const content = await Content.find(query)
    .sort({ collectedAt: -1 })
    .limit(parseInt(limit as string))
    .skip(parseInt(offset as string))
    .lean();

  const total = await Content.countDocuments(query);

  res.json({
    content,
    pagination: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      hasMore: total > parseInt(offset as string) + parseInt(limit as string),
    },
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id);
  
  if (!content) {
    return res.status(404).json({ error: 'Content not found' });
  }

  res.json(content);
}));

router.post('/:id/analyze', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  if (!content) {
    return res.status(404).json({ error: 'Content not found' });
  }

  const result = await contentDetectionService.analyzeContent(id);
  
  res.json({
    contentId: id,
    analysisResult: result,
  });
}));

router.post('/batch-analyze', asyncHandler(async (req, res) => {
  const { contentIds } = req.body;
  
  if (!Array.isArray(contentIds) || contentIds.length === 0) {
    return res.status(400).json({ error: 'contentIds must be a non-empty array' });
  }

  if (contentIds.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 content items per batch' });
  }

  const results = await contentDetectionService.batchAnalyzeContent(contentIds);
  
  res.json({
    results: Object.fromEntries(results),
    processed: results.size,
    requested: contentIds.length,
  });
}));

router.get('/stats/detection', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const timeframe = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };

  const stats = await contentDetectionService.getDetectionStats(timeframe);
  
  res.json({
    timeframe,
    stats,
  });
}));

router.get('/trending/harmful', asyncHandler(async (req, res) => {
  const { platform, hours = 24 } = req.query;
  
  const timeframe = {
    start: new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000),
    end: new Date(),
  };

  const trendingContent = await contentDetectionService.analyzeTrendingContent(
    platform as string,
    timeframe
  );
  
  res.json({
    timeframe,
    platform: platform || 'all',
    trendingHarmfulContent: trendingContent,
  });
}));

router.post('/ingest', asyncHandler(async (req, res) => {
  const { platform, query, hashtag, maxResults = 100 } = req.body;
  
  if (!platform) {
    return res.status(400).json({ error: 'Platform is required' });
  }

  await contentIngestionService.addIngestionJob({
    platform,
    query,
    hashtag,
    maxResults: Math.min(maxResults, 1000),
  });

  res.json({
    message: 'Ingestion job queued successfully',
    platform,
    query,
    hashtag,
    maxResults,
  });
}));

router.get('/ingestion/stats', asyncHandler(async (req, res) => {
  const stats = await contentIngestionService.getQueueStats();
  
  res.json({
    queueStats: stats,
    timestamp: new Date(),
  });
}));

router.post('/ingestion/pause', asyncHandler(async (req, res) => {
  await contentIngestionService.pauseIngestion();
  
  res.json({
    message: 'Content ingestion paused',
    timestamp: new Date(),
  });
}));

router.post('/ingestion/resume', asyncHandler(async (req, res) => {
  await contentIngestionService.resumeIngestion();
  
  res.json({
    message: 'Content ingestion resumed',
    timestamp: new Date(),
  });
}));

export { router as contentRoutes };