import axios, { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';
import { IContent } from '@/models/Content';

export interface YouTubeCollectionParams {
  query?: string;
  hashtag?: string;
  maxResults?: number;
  channelId?: string;
}

export class YouTubeIngestionAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  public async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    try {
      await this.client.get('/search', {
        params: {
          part: 'snippet',
          q: 'test',
          maxResults: 1,
          key: this.apiKey,
        },
      });

      logger.info('YouTube API connection verified');
    } catch (error: any) {
      logger.error('Failed to verify YouTube API connection:', error.response?.data || error.message);
      throw new Error('YouTube API initialization failed');
    }
  }

  public async collectContent(params: YouTubeCollectionParams): Promise<Partial<IContent>[]> {
    try {
      const videos = await this.searchVideos(params);
      const enrichedVideos = await this.enrichVideoDetails(videos);

      return enrichedVideos.map(video => this.transformVideoToContent(video));
    } catch (error) {
      logger.error('Failed to collect YouTube content:', error);
      throw error;
    }
  }

  private async searchVideos(params: YouTubeCollectionParams): Promise<any[]> {
    const searchParams: any = {
      part: 'snippet',
      type: 'video',
      order: 'date',
      maxResults: Math.min(params.maxResults || 50, 50),
      key: this.apiKey,
    };

    if (params.query) {
      searchParams.q = params.query;
    }

    if (params.hashtag) {
      searchParams.q = (searchParams.q ? `${searchParams.q} ` : '') + `#${params.hashtag.replace('#', '')}`;
    }

    if (params.channelId) {
      searchParams.channelId = params.channelId;
    }

    const response = await this.client.get('/search', { params: searchParams });
    return response.data.items || [];
  }

  private async enrichVideoDetails(videos: any[]): Promise<any[]> {
    if (videos.length === 0) return [];

    const videoIds = videos.map(video => video.id.videoId).join(',');
    
    const response = await this.client.get('/videos', {
      params: {
        part: 'statistics,contentDetails,snippet',
        id: videoIds,
        key: this.apiKey,
      },
    });

    const videoDetails = response.data.items || [];
    
    return videos.map(video => {
      const details = videoDetails.find(detail => detail.id === video.id.videoId);
      return {
        ...video,
        statistics: details?.statistics || {},
        contentDetails: details?.contentDetails || {},
      };
    });
  }

  private async getChannelDetails(channelId: string): Promise<any> {
    try {
      const response = await this.client.get('/channels', {
        params: {
          part: 'statistics,snippet',
          id: channelId,
          key: this.apiKey,
        },
      });

      return response.data.items?.[0] || {};
    } catch (error) {
      logger.error(`Failed to get channel details for ${channelId}:`, error);
      return {};
    }
  }

  private transformVideoToContent(video: any): Partial<IContent> {
    const snippet = video.snippet;
    const statistics = video.statistics || {};

    return {
      platform: 'youtube',
      platformId: video.id.videoId || video.id,
      type: 'video',
      content: {
        text: `${snippet.title}\n\n${snippet.description}`,
        videoUrl: `https://www.youtube.com/watch?v=${video.id.videoId || video.id}`,
        imageUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        metadata: {
          duration: video.contentDetails?.duration,
          definition: video.contentDetails?.definition,
          caption: video.contentDetails?.caption,
          tags: snippet.tags || [],
        },
      },
      author: {
        platformUserId: snippet.channelId,
        username: snippet.channelTitle,
        followerCount: undefined, // Will be enriched separately if needed
        verified: false, // YouTube doesn't provide this in basic API
      },
      engagement: {
        likes: parseInt(statistics.likeCount || '0', 10),
        shares: 0, // YouTube API doesn't provide share count
        comments: parseInt(statistics.commentCount || '0', 10),
        views: parseInt(statistics.viewCount || '0', 10),
      },
      language: snippet.defaultLanguage || snippet.defaultAudioLanguage || 'en',
      hashtags: this.extractHashtags(snippet.description || ''),
      mentions: this.extractMentions(snippet.description || ''),
      urls: this.extractUrls(snippet.description || ''),
      originalUrl: `https://www.youtube.com/watch?v=${video.id.videoId || video.id}`,
      publishedAt: new Date(snippet.publishedAt),
    };
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    return (text.match(hashtagRegex) || []).map(tag => tag.substring(1).toLowerCase());
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@[\w]+/g;
    return (text.match(mentionRegex) || []).map(mention => mention.substring(1));
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }
}