import { logger } from '@/utils/logger';
import { Content, IContent } from '@/models/Content';
import { TextClassifier } from '@/models/detectors/TextClassifier';
import { ImageClassifier } from '@/models/detectors/ImageClassifier';
import { VideoClassifier } from '@/models/detectors/VideoClassifier';
import { AudioClassifier } from '@/models/detectors/AudioClassifier';
import { EnsembleClassifier } from '@/models/detectors/EnsembleClassifier';

export interface DetectionResult {
  harmfulnessScore: number;
  categories: string[];
  confidence: number;
  reasoning: string;
  flagged: boolean;
  metadata?: Record<string, any>;
}

export interface DetectionConfig {
  harmfulnessThreshold: number;
  confidenceThreshold: number;
  enabledDetectors: string[];
  categories: string[];
}

export class ContentDetectionService {
  private textClassifier: TextClassifier;
  private imageClassifier: ImageClassifier;
  private videoClassifier: VideoClassifier;
  private audioClassifier: AudioClassifier;
  private ensembleClassifier: EnsembleClassifier;
  private config: DetectionConfig;

  constructor() {
    this.config = {
      harmfulnessThreshold: parseFloat(process.env.HARMFUL_CONTENT_THRESHOLD || '0.85'),
      confidenceThreshold: 0.7,
      enabledDetectors: ['text', 'image', 'video', 'audio'],
      categories: [
        'hate_speech',
        'cyberbullying',
        'harassment',
        'dangerous_challenge',
        'self_harm',
        'violence',
        'sexual_content',
        'misinformation',
        'spam',
        'fraud',
        'illegal_activity',
        'extremism',
      ],
    };

    this.textClassifier = new TextClassifier();
    this.imageClassifier = new ImageClassifier();
    this.videoClassifier = new VideoClassifier();
    this.audioClassifier = new AudioClassifier();
    this.ensembleClassifier = new EnsembleClassifier();
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Content Detection Service...');

      const initPromises = [];

      if (this.config.enabledDetectors.includes('text')) {
        initPromises.push(this.textClassifier.initialize());
      }

      if (this.config.enabledDetectors.includes('image')) {
        initPromises.push(this.imageClassifier.initialize());
      }

      if (this.config.enabledDetectors.includes('video')) {
        initPromises.push(this.videoClassifier.initialize());
      }

      if (this.config.enabledDetectors.includes('audio')) {
        initPromises.push(this.audioClassifier.initialize());
      }

      await Promise.all(initPromises);
      await this.ensembleClassifier.initialize();

      logger.info('Content Detection Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Content Detection Service:', error);
      throw error;
    }
  }

  public async analyzeContent(contentId: string): Promise<DetectionResult> {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      const results: DetectionResult[] = [];

      if (content.content.text && this.config.enabledDetectors.includes('text')) {
        const textResult = await this.textClassifier.classify(content.content.text, {
          language: content.language,
          author: content.author,
          context: {
            platform: content.platform,
            engagement: content.engagement,
            hashtags: content.hashtags,
          },
        });
        results.push(textResult);
      }

      if (content.content.imageUrl && this.config.enabledDetectors.includes('image')) {
        const imageResult = await this.imageClassifier.classify(content.content.imageUrl, {
          context: content.content.text,
        });
        results.push(imageResult);
      }

      if (content.content.videoUrl && this.config.enabledDetectors.includes('video')) {
        const videoResult = await this.videoClassifier.classify(content.content.videoUrl, {
          context: content.content.text,
        });
        results.push(videoResult);
      }

      if (content.content.audioUrl && this.config.enabledDetectors.includes('audio')) {
        const audioResult = await this.audioClassifier.classify(content.content.audioUrl, {
          context: content.content.text,
        });
        results.push(audioResult);
      }

      const finalResult = await this.ensembleClassifier.combine(results, {
        contentType: content.type,
        platform: content.platform,
        weights: this.getClassifierWeights(content),
      });

      await this.saveAnalysisResults(contentId, finalResult);

      return finalResult;
    } catch (error) {
      logger.error(`Failed to analyze content ${contentId}:`, error);
      throw error;
    }
  }

  public async batchAnalyzeContent(contentIds: string[]): Promise<Map<string, DetectionResult>> {
    const results = new Map<string, DetectionResult>();
    const batchSize = 10;

    for (let i = 0; i < contentIds.length; i += batchSize) {
      const batch = contentIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (contentId) => {
        try {
          const result = await this.analyzeContent(contentId);
          return { contentId, result };
        } catch (error) {
          logger.error(`Failed to analyze content in batch: ${contentId}`, error);
          return { contentId, result: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ contentId, result }) => {
        if (result) {
          results.set(contentId, result);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  public async analyzeTrendingContent(platform?: string, timeframe?: { start: Date; end: Date }): Promise<DetectionResult[]> {
    try {
      const query: any = {
        processingStatus: 'completed',
        'analysisResults.flagged': true,
      };

      if (platform) {
        query.platform = platform;
      }

      if (timeframe) {
        query.publishedAt = {
          $gte: timeframe.start,
          $lte: timeframe.end,
        };
      }

      const flaggedContent = await Content.find(query)
        .sort({ 'analysisResults.harmfulnessScore': -1, 'engagement.views': -1 })
        .limit(100)
        .lean();

      return flaggedContent.map(content => content.analysisResults!);
    } catch (error) {
      logger.error('Failed to analyze trending harmful content:', error);
      throw error;
    }
  }

  public async getDetectionStats(timeframe: { start: Date; end: Date }): Promise<any> {
    try {
      const pipeline = [
        {
          $match: {
            collectedAt: {
              $gte: timeframe.start,
              $lte: timeframe.end,
            },
            processingStatus: 'completed',
          },
        },
        {
          $group: {
            _id: {
              platform: '$platform',
              flagged: '$analysisResults.flagged',
            },
            count: { $sum: 1 },
            avgHarmfulnessScore: { $avg: '$analysisResults.harmfulnessScore' },
            categories: { $addToSet: '$analysisResults.categories' },
          },
        },
        {
          $group: {
            _id: '$_id.platform',
            stats: {
              $push: {
                flagged: '$_id.flagged',
                count: '$count',
                avgHarmfulnessScore: '$avgHarmfulnessScore',
                categories: '$categories',
              },
            },
          },
        },
      ];

      const results = await Content.aggregate(pipeline);
      
      const stats = {
        totalProcessed: 0,
        totalFlagged: 0,
        flaggedRate: 0,
        platforms: {},
        categories: {},
      };

      results.forEach((platformData) => {
        const platform = platformData._id;
        const platformStats = {
          total: 0,
          flagged: 0,
          flaggedRate: 0,
          avgHarmfulnessScore: 0,
        };

        platformData.stats.forEach((stat: any) => {
          platformStats.total += stat.count;
          stats.totalProcessed += stat.count;

          if (stat.flagged) {
            platformStats.flagged += stat.count;
            stats.totalFlagged += stat.count;
            platformStats.avgHarmfulnessScore = stat.avgHarmfulnessScore;

            stat.categories.flat().forEach((category: string) => {
              stats.categories[category] = (stats.categories[category] || 0) + 1;
            });
          }
        });

        platformStats.flaggedRate = platformStats.total > 0 ? platformStats.flagged / platformStats.total : 0;
        stats.platforms[platform] = platformStats;
      });

      stats.flaggedRate = stats.totalProcessed > 0 ? stats.totalFlagged / stats.totalProcessed : 0;

      return stats;
    } catch (error) {
      logger.error('Failed to get detection stats:', error);
      throw error;
    }
  }

  private async saveAnalysisResults(contentId: string, result: DetectionResult): Promise<void> {
    try {
      await Content.findByIdAndUpdate(contentId, {
        $set: {
          processingStatus: 'completed',
          analysisResults: result,
        },
      });
    } catch (error) {
      logger.error(`Failed to save analysis results for content ${contentId}:`, error);
      throw error;
    }
  }

  private getClassifierWeights(content: IContent): Record<string, number> {
    const weights: Record<string, number> = {
      text: 1.0,
      image: 0.8,
      video: 0.9,
      audio: 0.7,
    };

    if (content.type === 'video') {
      weights.video = 1.2;
      weights.audio = 1.0;
    } else if (content.type === 'image') {
      weights.image = 1.2;
    }

    if (content.engagement.views && content.engagement.views > 10000) {
      Object.keys(weights).forEach(key => {
        weights[key] *= 1.1;
      });
    }

    return weights;
  }

  public updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Detection configuration updated', this.config);
  }

  public getConfig(): DetectionConfig {
    return { ...this.config };
  }
}