import Bull, { Queue, Job } from 'bull';
import { logger } from '@/utils/logger';
import { getRedisClient } from '@/core/redis';
import { Content, IContent } from '@/models/Content';
import { TwitterIngestionAdapter } from '@/data/adapters/TwitterAdapter';
import { YouTubeIngestionAdapter } from '@/data/adapters/YouTubeAdapter';
import { InstagramIngestionAdapter } from '@/data/adapters/InstagramAdapter';
import { TikTokIngestionAdapter } from '@/data/adapters/TikTokAdapter';

export interface ContentIngestionJob {
  platform: string;
  query?: string;
  userId?: string;
  hashtag?: string;
  location?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  maxResults?: number;
}

export class ContentIngestionService {
  private ingestionQueue: Queue;
  private processingQueue: Queue;
  private adapters: Map<string, any>;

  constructor() {
    const redisClient = getRedisClient();
    
    this.ingestionQueue = new Bull('content-ingestion', {
      redis: {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_HOST || 'localhost',
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.processingQueue = new Bull('content-processing', {
      redis: {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_HOST || 'localhost',
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.adapters = new Map();
    this.setupAdapters();
    this.setupQueueProcessors();
  }

  private setupAdapters(): void {
    this.adapters.set('twitter', new TwitterIngestionAdapter());
    this.adapters.set('youtube', new YouTubeIngestionAdapter());
    this.adapters.set('instagram', new InstagramIngestionAdapter());
    this.adapters.set('tiktok', new TikTokIngestionAdapter());
  }

  private setupQueueProcessors(): void {
    this.ingestionQueue.process('collect-content', 10, this.processIngestionJob.bind(this));
    this.processingQueue.process('process-content', 20, this.processContentJob.bind(this));

    this.ingestionQueue.on('completed', (job) => {
      logger.info(`Ingestion job completed: ${job.id}`);
    });

    this.ingestionQueue.on('failed', (job, err) => {
      logger.error(`Ingestion job failed: ${job.id}`, err);
    });

    this.processingQueue.on('completed', (job) => {
      logger.info(`Processing job completed: ${job.id}`);
    });

    this.processingQueue.on('failed', (job, err) => {
      logger.error(`Processing job failed: ${job.id}`, err);
    });
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Content Ingestion Service...');

      for (const [platform, adapter] of this.adapters) {
        await adapter.initialize();
        logger.info(`${platform} adapter initialized`);
      }

      this.schedulePeriodicIngestion();
      logger.info('Content Ingestion Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Content Ingestion Service:', error);
      throw error;
    }
  }

  private schedulePeriodicIngestion(): void {
    const platforms = ['twitter', 'youtube', 'instagram', 'tiktok'];
    
    platforms.forEach((platform) => {
      this.ingestionQueue.add(
        'collect-content',
        {
          platform,
          maxResults: 1000,
        },
        {
          repeat: { cron: '*/5 * * * *' }, // Every 5 minutes
          jobId: `periodic-${platform}`,
        }
      );
    });

    logger.info('Periodic ingestion scheduled for all platforms');
  }

  private async processIngestionJob(job: Job<ContentIngestionJob>): Promise<void> {
    const { platform, query, hashtag, maxResults = 100 } = job.data;

    try {
      logger.info(`Processing ingestion job for ${platform}`, job.data);

      const adapter = this.adapters.get(platform);
      if (!adapter) {
        throw new Error(`No adapter found for platform: ${platform}`);
      }

      const contentItems = await adapter.collectContent({
        query,
        hashtag,
        maxResults,
      });

      logger.info(`Collected ${contentItems.length} items from ${platform}`);

      for (const item of contentItems) {
        await this.saveContent(item);
        
        await this.processingQueue.add('process-content', {
          contentId: item._id,
        });
      }

      job.progress(100);
    } catch (error) {
      logger.error(`Failed to process ingestion job for ${platform}:`, error);
      throw error;
    }
  }

  private async processContentJob(job: Job<{ contentId: string }>): Promise<void> {
    const { contentId } = job.data;

    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      content.processingStatus = 'processing';
      await content.save();

      job.progress(100);

      logger.info(`Content processing completed for: ${contentId}`);
    } catch (error) {
      logger.error(`Failed to process content ${contentId}:`, error);
      
      await Content.findByIdAndUpdate(contentId, {
        processingStatus: 'failed',
      });

      throw error;
    }
  }

  private async saveContent(contentData: Partial<IContent>): Promise<IContent> {
    try {
      const existingContent = await Content.findOne({
        platform: contentData.platform,
        platformId: contentData.platformId,
      });

      if (existingContent) {
        Object.assign(existingContent, {
          ...contentData,
          collectedAt: new Date(),
        });
        return await existingContent.save();
      }

      const content = new Content({
        ...contentData,
        collectedAt: new Date(),
        processingStatus: 'pending',
      });

      return await content.save();
    } catch (error) {
      logger.error('Failed to save content:', error);
      throw error;
    }
  }

  public async addIngestionJob(jobData: ContentIngestionJob): Promise<void> {
    await this.ingestionQueue.add('collect-content', jobData);
    logger.info(`Ingestion job added for ${jobData.platform}`);
  }

  public async getQueueStats(): Promise<any> {
    const [ingestionWaiting, ingestionActive, processingWaiting, processingActive] = await Promise.all([
      this.ingestionQueue.waiting(),
      this.ingestionQueue.active(),
      this.processingQueue.waiting(),
      this.processingQueue.active(),
    ]);

    return {
      ingestion: {
        waiting: ingestionWaiting.length,
        active: ingestionActive.length,
      },
      processing: {
        waiting: processingWaiting.length,
        active: processingActive.length,
      },
    };
  }

  public async pauseIngestion(): Promise<void> {
    await this.ingestionQueue.pause();
    logger.info('Content ingestion paused');
  }

  public async resumeIngestion(): Promise<void> {
    await this.ingestionQueue.resume();
    logger.info('Content ingestion resumed');
  }
}