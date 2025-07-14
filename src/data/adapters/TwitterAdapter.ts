import axios, { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';
import { IContent } from '@/models/Content';

export interface TwitterCollectionParams {
  query?: string;
  hashtag?: string;
  maxResults?: number;
  userId?: string;
}

export interface TwitterAPIResponse {
  data?: any[];
  includes?: {
    users?: any[];
    media?: any[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

export class TwitterIngestionAdapter {
  private client: AxiosInstance;
  private bearerToken: string;
  private baseUrl = 'https://api.twitter.com/2';

  constructor() {
    this.bearerToken = process.env.TWITTER_API_KEY || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  public async initialize(): Promise<void> {
    if (!this.bearerToken) {
      throw new Error('Twitter API key not configured');
    }

    try {
      const response = await this.client.get('/tweets/search/recent', {
        params: {
          query: 'test',
          max_results: 10,
        },
      });

      logger.info('Twitter API connection verified');
    } catch (error: any) {
      logger.error('Failed to verify Twitter API connection:', error.response?.data || error.message);
      throw new Error('Twitter API initialization failed');
    }
  }

  public async collectContent(params: TwitterCollectionParams): Promise<Partial<IContent>[]> {
    try {
      const query = this.buildQuery(params);
      const tweets = await this.fetchTweets(query, params.maxResults || 100);

      return tweets.map(tweet => this.transformTweetToContent(tweet));
    } catch (error) {
      logger.error('Failed to collect Twitter content:', error);
      throw error;
    }
  }

  private buildQuery(params: TwitterCollectionParams): string {
    const queryParts: string[] = [];

    if (params.query) {
      queryParts.push(params.query);
    }

    if (params.hashtag) {
      queryParts.push(`#${params.hashtag.replace('#', '')}`);
    }

    queryParts.push('-is:retweet');
    queryParts.push('lang:en OR lang:es OR lang:fr OR lang:de OR lang:it OR lang:pt');

    return queryParts.join(' ');
  }

  private async fetchTweets(query: string, maxResults: number): Promise<any[]> {
    const allTweets: any[] = [];
    let nextToken: string | undefined;
    const batchSize = Math.min(maxResults, 100);

    try {
      while (allTweets.length < maxResults) {
        const params: any = {
          query,
          max_results: Math.min(batchSize, maxResults - allTweets.length),
          'tweet.fields': 'id,text,author_id,created_at,public_metrics,lang,context_annotations,entities,geo',
          'user.fields': 'id,name,username,public_metrics,verified,created_at',
          'media.fields': 'type,url,preview_image_url',
          expansions: 'author_id,attachments.media_keys',
        };

        if (nextToken) {
          params.next_token = nextToken;
        }

        const response = await this.client.get('/tweets/search/recent', { params });
        const data: TwitterAPIResponse = response.data;

        if (!data.data || data.data.length === 0) {
          break;
        }

        const enrichedTweets = this.enrichTweetsWithUserData(data);
        allTweets.push(...enrichedTweets);

        nextToken = data.meta?.next_token;
        if (!nextToken) {
          break;
        }

        await this.rateLimitDelay();
      }

      logger.info(`Fetched ${allTweets.length} tweets for query: ${query}`);
      return allTweets;
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('Twitter API rate limit exceeded');
        throw new Error('Rate limit exceeded');
      }
      throw error;
    }
  }

  private enrichTweetsWithUserData(response: TwitterAPIResponse): any[] {
    const { data: tweets = [], includes } = response;
    const users = includes?.users || [];
    const media = includes?.media || [];

    return tweets.map(tweet => ({
      ...tweet,
      user: users.find(user => user.id === tweet.author_id),
      media: tweet.attachments?.media_keys?.map((key: string) =>
        media.find(m => m.media_key === key)
      ).filter(Boolean) || [],
    }));
  }

  private transformTweetToContent(tweet: any): Partial<IContent> {
    const hasMedia = tweet.media && tweet.media.length > 0;
    const mediaType = hasMedia ? tweet.media[0].type : null;

    let contentType: 'text' | 'image' | 'video' | 'mixed' = 'text';
    if (hasMedia) {
      if (mediaType === 'photo') contentType = 'image';
      else if (mediaType === 'video') contentType = 'video';
      else contentType = 'mixed';
    }

    return {
      platform: 'twitter',
      platformId: tweet.id,
      type: contentType,
      content: {
        text: tweet.text,
        imageUrl: hasMedia && mediaType === 'photo' ? tweet.media[0].url : undefined,
        videoUrl: hasMedia && mediaType === 'video' ? tweet.media[0].url : undefined,
        metadata: {
          contextAnnotations: tweet.context_annotations,
          entities: tweet.entities,
        },
      },
      author: {
        platformUserId: tweet.author_id,
        username: tweet.user?.username,
        followerCount: tweet.user?.public_metrics?.followers_count,
        accountAge: tweet.user?.created_at ? new Date(tweet.user.created_at) : undefined,
        verified: tweet.user?.verified || false,
      },
      engagement: {
        likes: tweet.public_metrics?.like_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
        comments: tweet.public_metrics?.reply_count || 0,
        views: tweet.public_metrics?.impression_count,
      },
      language: tweet.lang || 'en',
      hashtags: this.extractHashtags(tweet.text),
      mentions: this.extractMentions(tweet.text),
      urls: this.extractUrls(tweet.entities?.urls || []),
      originalUrl: `https://twitter.com/${tweet.user?.username}/status/${tweet.id}`,
      publishedAt: new Date(tweet.created_at),
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

  private extractUrls(urlEntities: any[]): string[] {
    return urlEntities.map(entity => entity.expanded_url || entity.url).filter(Boolean);
  }

  private async rateLimitDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}