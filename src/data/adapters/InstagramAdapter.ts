import axios, { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';
import { IContent } from '@/models/Content';

export interface InstagramCollectionParams {
  query?: string;
  hashtag?: string;
  maxResults?: number;
  userId?: string;
}

export class InstagramIngestionAdapter {
  private client: AxiosInstance;
  private accessToken: string;
  private baseUrl = 'https://graph.instagram.com';

  constructor() {
    this.accessToken = process.env.INSTAGRAM_API_KEY || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  public async initialize(): Promise<void> {
    if (!this.accessToken) {
      logger.warn('Instagram API key not configured - using fallback methods');
      return;
    }

    try {
      await this.client.get('/me', {
        params: {
          fields: 'id,username',
          access_token: this.accessToken,
        },
      });

      logger.info('Instagram API connection verified');
    } catch (error: any) {
      logger.error('Failed to verify Instagram API connection:', error.response?.data || error.message);
      logger.warn('Instagram adapter will use limited functionality');
    }
  }

  public async collectContent(params: InstagramCollectionParams): Promise<Partial<IContent>[]> {
    try {
      if (params.hashtag) {
        return await this.collectHashtagContent(params.hashtag, params.maxResults || 50);
      }

      if (params.userId) {
        return await this.collectUserContent(params.userId, params.maxResults || 50);
      }

      logger.warn('Instagram collection requires hashtag or userId parameter');
      return [];
    } catch (error) {
      logger.error('Failed to collect Instagram content:', error);
      return [];
    }
  }

  private async collectHashtagContent(hashtag: string, maxResults: number): Promise<Partial<IContent>[]> {
    try {
      const cleanHashtag = hashtag.replace('#', '');
      
      const response = await this.client.get(`/ig_hashtag_search`, {
        params: {
          user_id: process.env.INSTAGRAM_USER_ID,
          q: cleanHashtag,
          access_token: this.accessToken,
        },
      });

      const hashtagId = response.data.data?.[0]?.id;
      if (!hashtagId) {
        logger.warn(`Hashtag ${hashtag} not found on Instagram`);
        return [];
      }

      const mediaResponse = await this.client.get(`/${hashtagId}/recent_media`, {
        params: {
          user_id: process.env.INSTAGRAM_USER_ID,
          fields: 'id,media_type,media_url,permalink,thumbnail_url,timestamp,caption,like_count,comments_count',
          limit: Math.min(maxResults, 25),
          access_token: this.accessToken,
        },
      });

      const mediaItems = mediaResponse.data.data || [];
      
      return await Promise.all(
        mediaItems.map(async (item: any) => await this.transformMediaToContent(item, hashtag))
      );
    } catch (error) {
      logger.error(`Failed to collect hashtag content for #${hashtag}:`, error);
      return [];
    }
  }

  private async collectUserContent(userId: string, maxResults: number): Promise<Partial<IContent>[]> {
    try {
      const response = await this.client.get(`/${userId}/media`, {
        params: {
          fields: 'id,media_type,media_url,permalink,thumbnail_url,timestamp,caption,like_count,comments_count',
          limit: Math.min(maxResults, 25),
          access_token: this.accessToken,
        },
      });

      const mediaItems = response.data.data || [];
      
      return await Promise.all(
        mediaItems.map(async (item: any) => await this.transformMediaToContent(item))
      );
    } catch (error) {
      logger.error(`Failed to collect user content for ${userId}:`, error);
      return [];
    }
  }

  private async getUserDetails(userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${userId}`, {
        params: {
          fields: 'id,username,followers_count,media_count',
          access_token: this.accessToken,
        },
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to get user details for ${userId}:`, error);
      return {};
    }
  }

  private async transformMediaToContent(media: any, hashtag?: string): Promise<Partial<IContent>> {
    let contentType: 'text' | 'image' | 'video' | 'mixed' = 'image';
    
    if (media.media_type === 'VIDEO') {
      contentType = 'video';
    } else if (media.media_type === 'CAROUSEL_ALBUM') {
      contentType = 'mixed';
    }

    const userDetails = await this.getUserDetails(media.owner?.id || 'unknown');

    return {
      platform: 'instagram',
      platformId: media.id,
      type: contentType,
      content: {
        text: media.caption || '',
        imageUrl: media.media_type === 'IMAGE' ? media.media_url : media.thumbnail_url,
        videoUrl: media.media_type === 'VIDEO' ? media.media_url : undefined,
        metadata: {
          mediaType: media.media_type,
          isCarousel: media.media_type === 'CAROUSEL_ALBUM',
        },
      },
      author: {
        platformUserId: media.owner?.id || 'unknown',
        username: userDetails.username,
        followerCount: userDetails.followers_count,
        verified: false, // Instagram Basic Display API doesn't provide verification status
      },
      engagement: {
        likes: media.like_count || 0,
        shares: 0, // Instagram API doesn't provide share count
        comments: media.comments_count || 0,
        views: 0, // Not available in Basic Display API
      },
      language: 'en', // Instagram doesn't provide language detection
      hashtags: hashtag ? [hashtag.replace('#', '')] : this.extractHashtags(media.caption || ''),
      mentions: this.extractMentions(media.caption || ''),
      urls: this.extractUrls(media.caption || ''),
      originalUrl: media.permalink,
      publishedAt: new Date(media.timestamp),
    };
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    return (text.match(hashtagRegex) || []).map(tag => tag.substring(1).toLowerCase());
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@[\w.]+/g;
    return (text.match(mentionRegex) || []).map(mention => mention.substring(1));
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }
}