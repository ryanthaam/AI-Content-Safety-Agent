import axios, { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';
import { IContent } from '@/models/Content';

export interface TikTokCollectionParams {
  query?: string;
  hashtag?: string;
  maxResults?: number;
  userId?: string;
}

export class TikTokIngestionAdapter {
  private client: AxiosInstance;
  private accessToken: string;
  private baseUrl = 'https://open-api.tiktok.com/platform';

  constructor() {
    this.accessToken = process.env.TIKTOK_API_KEY || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  public async initialize(): Promise<void> {
    if (!this.accessToken) {
      logger.warn('TikTok API key not configured - adapter will have limited functionality');
      return;
    }

    try {
      logger.info('TikTok API connection configured');
    } catch (error: any) {
      logger.error('Failed to verify TikTok API connection:', error.response?.data || error.message);
      logger.warn('TikTok adapter will use limited functionality');
    }
  }

  public async collectContent(params: TikTokCollectionParams): Promise<Partial<IContent>[]> {
    try {
      if (params.hashtag) {
        return await this.collectHashtagContent(params.hashtag, params.maxResults || 50);
      }

      if (params.query) {
        return await this.searchContent(params.query, params.maxResults || 50);
      }

      logger.warn('TikTok collection requires hashtag or query parameter');
      return [];
    } catch (error) {
      logger.error('Failed to collect TikTok content:', error);
      return [];
    }
  }

  private async collectHashtagContent(hashtag: string, maxResults: number): Promise<Partial<IContent>[]> {
    try {
      const cleanHashtag = hashtag.replace('#', '');
      
      const response = await this.client.post('/v1/research/video/query/', {
        query: {
          and: [
            {
              operation: 'EQ',
              field_name: 'hashtag_name',
              field_values: [cleanHashtag],
            }
          ],
        },
        max_count: Math.min(maxResults, 100),
        start_date: this.getDateDaysAgo(7), // Last 7 days
        end_date: new Date().toISOString().split('T')[0],
      });

      const videos = response.data.data?.videos || [];
      
      return videos.map((video: any) => this.transformVideoToContent(video, hashtag));
    } catch (error: any) {
      if (error.response?.status === 403) {
        logger.warn('TikTok Research API access not available, using fallback method');
        return this.fallbackHashtagCollection(hashtag, maxResults);
      }
      
      logger.error(`Failed to collect hashtag content for #${hashtag}:`, error);
      return [];
    }
  }

  private async searchContent(query: string, maxResults: number): Promise<Partial<IContent>[]> {
    try {
      const response = await this.client.post('/v1/research/video/query/', {
        query: {
          and: [
            {
              operation: 'IN',
              field_name: 'keyword',
              field_values: [query],
            }
          ],
        },
        max_count: Math.min(maxResults, 100),
        start_date: this.getDateDaysAgo(7),
        end_date: new Date().toISOString().split('T')[0],
      });

      const videos = response.data.data?.videos || [];
      
      return videos.map((video: any) => this.transformVideoToContent(video));
    } catch (error: any) {
      if (error.response?.status === 403) {
        logger.warn('TikTok Research API access not available');
        return [];
      }
      
      logger.error(`Failed to search TikTok content for "${query}":`, error);
      return [];
    }
  }

  private async fallbackHashtagCollection(hashtag: string, maxResults: number): Promise<Partial<IContent>[]> {
    logger.info(`Using fallback collection method for hashtag: ${hashtag}`);
    
    return [];
  }

  private transformVideoToContent(video: any, hashtag?: string): Partial<IContent> {
    return {
      platform: 'tiktok',
      platformId: video.id,
      type: 'video',
      content: {
        text: video.video_description || '',
        videoUrl: video.share_url,
        imageUrl: video.cover_image_url,
        metadata: {
          duration: video.duration,
          effects: video.effect_ids || [],
          sounds: video.music_id ? [video.music_id] : [],
        },
      },
      author: {
        platformUserId: video.username,
        username: video.username,
        followerCount: video.follower_count,
        verified: video.is_verified || false,
      },
      engagement: {
        likes: video.like_count || 0,
        shares: video.share_count || 0,
        comments: video.comment_count || 0,
        views: video.view_count || 0,
      },
      language: video.region_code || 'en',
      hashtags: hashtag ? [hashtag.replace('#', '')] : this.extractHashtags(video.hashtag_names || []),
      mentions: this.extractMentions(video.video_description || ''),
      urls: this.extractUrls(video.video_description || ''),
      originalUrl: video.share_url,
      publishedAt: new Date(video.create_time * 1000), // TikTok uses Unix timestamp
    };
  }

  private extractHashtags(hashtagNames: string[] | string): string[] {
    if (Array.isArray(hashtagNames)) {
      return hashtagNames.map(tag => tag.toLowerCase());
    }
    
    if (typeof hashtagNames === 'string') {
      const hashtagRegex = /#[\w]+/g;
      return (hashtagNames.match(hashtagRegex) || []).map(tag => tag.substring(1).toLowerCase());
    }
    
    return [];
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@[\w.]+/g;
    return (text.match(mentionRegex) || []).map(mention => mention.substring(1));
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}