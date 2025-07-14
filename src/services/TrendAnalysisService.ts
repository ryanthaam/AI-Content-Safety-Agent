import { logger } from '@/utils/logger';
import { Content, IContent } from '@/models/Content';
import { getRedisClient } from '@/core/redis';

export interface TrendData {
  id: string;
  hashtags: string[];
  keywords: string[];
  platforms: string[];
  harmfulnessScore: number;
  viralityScore: number;
  growthRate: number;
  firstDetected: Date;
  lastUpdated: Date;
  contentCount: number;
  averageEngagement: number;
  categories: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface EarlyWarning {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trendData: TrendData;
  recommendedActions: string[];
  createdAt: Date;
}

export class TrendAnalysisService {
  private redis: any;
  private trendThreshold: number;
  private viralityThreshold: number;

  constructor() {
    this.trendThreshold = parseFloat(process.env.TREND_DETECTION_THRESHOLD || '0.75');
    this.viralityThreshold = 1000; // Minimum engagement for virality consideration
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Trend Analysis Service...');
      this.redis = getRedisClient();

      this.startPeriodicAnalysis();
      logger.info('Trend Analysis Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Trend Analysis Service:', error);
      throw error;
    }
  }

  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      try {
        await this.analyzeCurrentTrends();
      } catch (error) {
        logger.error('Periodic trend analysis failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    logger.info('Periodic trend analysis started');
  }

  public async analyzeCurrentTrends(): Promise<TrendData[]> {
    try {
      const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      
      const trendingHashtags = await this.detectTrendingHashtags(timeWindow);
      const trendingKeywords = await this.detectTrendingKeywords(timeWindow);
      const crossPlatformTrends = await this.detectCrossPlatformTrends(timeWindow);

      const allTrends = [
        ...trendingHashtags,
        ...trendingKeywords,
        ...crossPlatformTrends,
      ];

      const consolidatedTrends = this.consolidateTrends(allTrends);
      
      for (const trend of consolidatedTrends) {
        await this.storeTrendData(trend);
        
        if (trend.riskLevel === 'high' || trend.riskLevel === 'critical') {
          await this.generateEarlyWarning(trend);
        }
      }

      return consolidatedTrends;
    } catch (error) {
      logger.error('Failed to analyze current trends:', error);
      throw error;
    }
  }

  private async detectTrendingHashtags(timeWindow: Date): Promise<TrendData[]> {
    try {
      const pipeline = [
        {
          $match: {
            collectedAt: { $gte: timeWindow },
            hashtags: { $exists: true, $ne: [] },
            processingStatus: 'completed',
          },
        },
        {
          $unwind: '$hashtags',
        },
        {
          $group: {
            _id: '$hashtags',
            count: { $sum: 1 },
            platforms: { $addToSet: '$platform' },
            avgHarmfulnessScore: { $avg: '$analysisResults.harmfulnessScore' },
            totalEngagement: {
              $sum: {
                $add: ['$engagement.likes', '$engagement.shares', '$engagement.comments'],
              },
            },
            categories: { $addToSet: '$analysisResults.categories' },
            firstSeen: { $min: '$collectedAt' },
            lastSeen: { $max: '$collectedAt' },
          },
        },
        {
          $match: {
            count: { $gte: 10 }, // Minimum 10 occurrences
            avgHarmfulnessScore: { $gte: this.trendThreshold },
          },
        },
        {
          $sort: { count: -1, avgHarmfulnessScore: -1 },
        },
        {
          $limit: 20,
        },
      ];

      const results = await Content.aggregate(pipeline);
      
      return results.map((result) => this.createTrendData({
        id: `hashtag_${result._id}`,
        hashtags: [result._id],
        keywords: [],
        platforms: result.platforms,
        harmfulnessScore: result.avgHarmfulnessScore,
        contentCount: result.count,
        averageEngagement: result.totalEngagement / result.count,
        categories: result.categories.flat(),
        firstDetected: result.firstSeen,
        lastUpdated: result.lastSeen,
      }));
    } catch (error) {
      logger.error('Failed to detect trending hashtags:', error);
      return [];
    }
  }

  private async detectTrendingKeywords(timeWindow: Date): Promise<TrendData[]> {
    try {
      const pipeline = [
        {
          $match: {
            collectedAt: { $gte: timeWindow },
            'content.text': { $exists: true, $ne: null },
            'analysisResults.flagged': true,
            processingStatus: 'completed',
          },
        },
        {
          $project: {
            words: {
              $filter: {
                input: { $split: [{ $toLower: '$content.text' }, ' '] },
                cond: { $gte: [{ $strLenCP: '$$this' }, 4] },
              },
            },
            platform: 1,
            harmfulnessScore: '$analysisResults.harmfulnessScore',
            engagement: 1,
            categories: '$analysisResults.categories',
            collectedAt: 1,
          },
        },
        {
          $unwind: '$words',
        },
        {
          $group: {
            _id: '$words',
            count: { $sum: 1 },
            platforms: { $addToSet: '$platform' },
            avgHarmfulnessScore: { $avg: '$harmfulnessScore' },
            totalEngagement: {
              $sum: {
                $add: ['$engagement.likes', '$engagement.shares', '$engagement.comments'],
              },
            },
            categories: { $addToSet: '$categories' },
            firstSeen: { $min: '$collectedAt' },
            lastSeen: { $max: '$collectedAt' },
          },
        },
        {
          $match: {
            count: { $gte: 15 },
            avgHarmfulnessScore: { $gte: this.trendThreshold },
            _id: { $not: /^(the|and|or|but|in|on|at|to|for|of|with|by)$/ },
          },
        },
        {
          $sort: { count: -1, avgHarmfulnessScore: -1 },
        },
        {
          $limit: 15,
        },
      ];

      const results = await Content.aggregate(pipeline);
      
      return results.map((result) => this.createTrendData({
        id: `keyword_${result._id}`,
        hashtags: [],
        keywords: [result._id],
        platforms: result.platforms,
        harmfulnessScore: result.avgHarmfulnessScore,
        contentCount: result.count,
        averageEngagement: result.totalEngagement / result.count,
        categories: result.categories.flat(),
        firstDetected: result.firstSeen,
        lastUpdated: result.lastSeen,
      }));
    } catch (error) {
      logger.error('Failed to detect trending keywords:', error);
      return [];
    }
  }

  private async detectCrossPlatformTrends(timeWindow: Date): Promise<TrendData[]> {
    try {
      const pipeline = [
        {
          $match: {
            collectedAt: { $gte: timeWindow },
            'analysisResults.flagged': true,
            processingStatus: 'completed',
          },
        },
        {
          $group: {
            _id: {
              categories: '$analysisResults.categories',
              hashtags: '$hashtags',
            },
            platforms: { $addToSet: '$platform' },
            count: { $sum: 1 },
            avgHarmfulnessScore: { $avg: '$analysisResults.harmfulnessScore' },
            totalEngagement: {
              $sum: {
                $add: ['$engagement.likes', '$engagement.shares', '$engagement.comments'],
              },
            },
            firstSeen: { $min: '$collectedAt' },
            lastSeen: { $max: '$collectedAt' },
          },
        },
        {
          $match: {
            'platforms.1': { $exists: true }, // At least 2 platforms
            count: { $gte: 20 },
            avgHarmfulnessScore: { $gte: this.trendThreshold },
          },
        },
        {
          $sort: { count: -1, avgHarmfulnessScore: -1 },
        },
        {
          $limit: 10,
        },
      ];

      const results = await Content.aggregate(pipeline);
      
      return results.map((result, index) => this.createTrendData({
        id: `crossplatform_${index}`,
        hashtags: result._id.hashtags || [],
        keywords: [],
        platforms: result.platforms,
        harmfulnessScore: result.avgHarmfulnessScore,
        contentCount: result.count,
        averageEngagement: result.totalEngagement / result.count,
        categories: result._id.categories || [],
        firstDetected: result.firstSeen,
        lastUpdated: result.lastSeen,
      }));
    } catch (error) {
      logger.error('Failed to detect cross-platform trends:', error);
      return [];
    }
  }

  private createTrendData(data: Partial<TrendData>): TrendData {
    const viralityScore = this.calculateViralityScore(data.contentCount || 0, data.averageEngagement || 0);
    const growthRate = this.calculateGrowthRate(data.firstDetected!, data.lastUpdated!, data.contentCount || 0);
    const riskLevel = this.calculateRiskLevel(data.harmfulnessScore || 0, viralityScore, data.platforms?.length || 1);

    return {
      id: data.id || `trend_${Date.now()}`,
      hashtags: data.hashtags || [],
      keywords: data.keywords || [],
      platforms: data.platforms || [],
      harmfulnessScore: data.harmfulnessScore || 0,
      viralityScore,
      growthRate,
      firstDetected: data.firstDetected || new Date(),
      lastUpdated: data.lastUpdated || new Date(),
      contentCount: data.contentCount || 0,
      averageEngagement: data.averageEngagement || 0,
      categories: data.categories || [],
      riskLevel,
    };
  }

  private calculateViralityScore(contentCount: number, averageEngagement: number): number {
    const contentScore = Math.min(contentCount / 100, 1.0);
    const engagementScore = Math.min(averageEngagement / this.viralityThreshold, 1.0);
    return (contentScore + engagementScore) / 2;
  }

  private calculateGrowthRate(firstDetected: Date, lastUpdated: Date, contentCount: number): number {
    const timeSpanHours = (lastUpdated.getTime() - firstDetected.getTime()) / (1000 * 60 * 60);
    if (timeSpanHours <= 0) return 0;
    return contentCount / timeSpanHours;
  }

  private calculateRiskLevel(harmfulnessScore: number, viralityScore: number, platformCount: number): 'low' | 'medium' | 'high' | 'critical' {
    const riskScore = (harmfulnessScore * 0.5) + (viralityScore * 0.3) + (Math.min(platformCount / 5, 1) * 0.2);

    if (riskScore >= 0.85) return 'critical';
    if (riskScore >= 0.7) return 'high';
    if (riskScore >= 0.5) return 'medium';
    return 'low';
  }

  private consolidateTrends(trends: TrendData[]): TrendData[] {
    const consolidated: TrendData[] = [];
    const seen = new Set<string>();

    for (const trend of trends) {
      const key = this.getTrendKey(trend);
      if (!seen.has(key)) {
        seen.add(key);
        consolidated.push(trend);
      }
    }

    return consolidated.sort((a, b) => {
      const aScore = a.harmfulnessScore * a.viralityScore;
      const bScore = b.harmfulnessScore * b.viralityScore;
      return bScore - aScore;
    });
  }

  private getTrendKey(trend: TrendData): string {
    const hashtagKey = trend.hashtags.sort().join(',');
    const keywordKey = trend.keywords.sort().join(',');
    const categoryKey = trend.categories.sort().join(',');
    return `${hashtagKey}|${keywordKey}|${categoryKey}`;
  }

  private async storeTrendData(trend: TrendData): Promise<void> {
    try {
      const key = `trend:${trend.id}`;
      await this.redis.setEx(key, 24 * 60 * 60, JSON.stringify(trend)); // 24 hours TTL
      await this.redis.zAdd('trending:active', { score: trend.harmfulnessScore * trend.viralityScore, value: trend.id });
      
      logger.info(`Stored trend data: ${trend.id} (${trend.riskLevel} risk)`);
    } catch (error) {
      logger.error(`Failed to store trend data for ${trend.id}:`, error);
    }
  }

  private async generateEarlyWarning(trend: TrendData): Promise<void> {
    try {
      const warning: EarlyWarning = {
        id: `warning_${trend.id}_${Date.now()}`,
        title: this.generateWarningTitle(trend),
        description: this.generateWarningDescription(trend),
        severity: trend.riskLevel as any,
        trendData: trend,
        recommendedActions: this.generateRecommendedActions(trend),
        createdAt: new Date(),
      };

      const key = `warning:${warning.id}`;
      await this.redis.setEx(key, 7 * 24 * 60 * 60, JSON.stringify(warning)); // 7 days TTL
      await this.redis.lPush('warnings:active', warning.id);

      logger.warn(`Early warning generated: ${warning.title}`, warning);

      // Here you would typically trigger notifications
      // await this.notificationService.sendAlert(warning);
      
    } catch (error) {
      logger.error(`Failed to generate early warning for trend ${trend.id}:`, error);
    }
  }

  private generateWarningTitle(trend: TrendData): string {
    const type = trend.hashtags.length > 0 ? 'hashtag' : 'keyword';
    const identifier = trend.hashtags[0] || trend.keywords[0] || 'content';
    return `${trend.riskLevel.toUpperCase()} Risk: Trending ${type} "${identifier}"`;
  }

  private generateWarningDescription(trend: TrendData): string {
    const platforms = trend.platforms.join(', ');
    const categories = trend.categories.slice(0, 3).join(', ');
    return `Detected harmful trending content across ${platforms}. Categories: ${categories}. Growth rate: ${trend.growthRate.toFixed(1)} posts/hour.`;
  }

  private generateRecommendedActions(trend: TrendData): string[] {
    const actions: string[] = [];

    if (trend.riskLevel === 'critical') {
      actions.push('Immediate human review required');
      actions.push('Consider emergency content removal');
      actions.push('Notify platform partners');
    }

    if (trend.riskLevel === 'high') {
      actions.push('Escalate to senior moderators');
      actions.push('Increase monitoring frequency');
      actions.push('Prepare response guidelines');
    }

    if (trend.platforms.length > 2) {
      actions.push('Coordinate cross-platform response');
    }

    if (trend.categories.includes('self_harm')) {
      actions.push('Alert mental health support teams');
    }

    if (trend.categories.includes('dangerous_challenge')) {
      actions.push('Issue safety warnings');
    }

    return actions;
  }

  public async getTrendingSummary(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    try {
      const trendIds = await this.redis.zRange('trending:active', 0, 19, { REV: true });
      const trends = await Promise.all(
        trendIds.map(async (id: string) => {
          const data = await this.redis.get(`trend:${id}`);
          return data ? JSON.parse(data) : null;
        })
      );

      return {
        totalTrends: trends.filter(Boolean).length,
        highRiskTrends: trends.filter(t => t && (t.riskLevel === 'high' || t.riskLevel === 'critical')).length,
        topCategories: this.getTopCategories(trends.filter(Boolean)),
        topPlatforms: this.getTopPlatforms(trends.filter(Boolean)),
        trends: trends.filter(Boolean).slice(0, 10),
      };
    } catch (error) {
      logger.error('Failed to get trending summary:', error);
      throw error;
    }
  }

  private getTopCategories(trends: TrendData[]): Record<string, number> {
    const categories: Record<string, number> = {};
    trends.forEach(trend => {
      trend.categories.forEach(category => {
        categories[category] = (categories[category] || 0) + 1;
      });
    });
    return categories;
  }

  private getTopPlatforms(trends: TrendData[]): Record<string, number> {
    const platforms: Record<string, number> = {};
    trends.forEach(trend => {
      trend.platforms.forEach(platform => {
        platforms[platform] = (platforms[platform] || 0) + 1;
      });
    });
    return platforms;
  }
}