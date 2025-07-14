import Bull, { Queue, Job } from 'bull';
import { logger } from '@/utils/logger';
import { getRedisClient } from '@/core/redis';
import { Content, IContent } from '@/models/Content';
import { DetectionResult } from '@/services/ContentDetectionService';

export interface ResponseAction {
  type: 'flag' | 'remove' | 'escalate' | 'warn' | 'quarantine' | 'notify';
  severity: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  reason: string;
  metadata?: Record<string, any>;
}

export interface EscalationRule {
  id: string;
  name: string;
  conditions: {
    harmfulnessScore?: { min?: number; max?: number };
    categories?: string[];
    platforms?: string[];
    confidence?: { min?: number };
    viralityIndicators?: boolean;
  };
  actions: ResponseAction[];
  priority: number;
  enabled: boolean;
}

export interface ProcessingJob {
  contentId: string;
  detectionResult: DetectionResult;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class AutomatedResponseService {
  private responseQueue: Queue;
  private escalationQueue: Queue;
  private escalationRules: EscalationRule[];
  private autoActionThreshold: number;

  constructor() {
    this.responseQueue = new Bull('automated-response', {
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
          delay: 1000,
        },
      },
    });

    this.escalationQueue = new Bull('escalation', {
      redis: {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_HOST || 'localhost',
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.autoActionThreshold = parseFloat(process.env.AUTO_ACTION_THRESHOLD || '0.95');
    this.escalationRules = this.getDefaultEscalationRules();
    
    this.setupQueueProcessors();
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Automated Response Service...');
      
      await this.loadEscalationRules();
      
      logger.info('Automated Response Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Automated Response Service:', error);
      throw error;
    }
  }

  private setupQueueProcessors(): void {
    this.responseQueue.process('handle-content', 5, this.processContentResponse.bind(this));
    this.escalationQueue.process('escalate-content', 3, this.processEscalation.bind(this));

    this.responseQueue.on('completed', (job) => {
      logger.info(`Response job completed: ${job.id}`);
    });

    this.responseQueue.on('failed', (job, err) => {
      logger.error(`Response job failed: ${job.id}`, err);
    });

    this.escalationQueue.on('completed', (job) => {
      logger.info(`Escalation job completed: ${job.id}`);
    });

    this.escalationQueue.on('failed', (job, err) => {
      logger.error(`Escalation job failed: ${job.id}`, err);
    });
  }

  public async processContent(contentId: string, detectionResult: DetectionResult): Promise<void> {
    try {
      const urgency = this.determineUrgency(detectionResult);
      
      const jobData: ProcessingJob = {
        contentId,
        detectionResult,
        urgency,
      };

      const priority = this.getJobPriority(urgency);
      
      await this.responseQueue.add('handle-content', jobData, {
        priority,
        delay: urgency === 'critical' ? 0 : 1000,
      });

      logger.info(`Content response queued: ${contentId} (${urgency} urgency)`);
    } catch (error) {
      logger.error(`Failed to queue content response for ${contentId}:`, error);
      throw error;
    }
  }

  private async processContentResponse(job: Job<ProcessingJob>): Promise<void> {
    const { contentId, detectionResult, urgency } = job.data;

    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      const applicableRules = this.findApplicableRules(detectionResult, content);
      const actions = this.consolidateActions(applicableRules);

      for (const action of actions) {
        await this.executeAction(contentId, action, detectionResult);
      }

      await this.logResponseActions(contentId, actions, detectionResult);

      job.progress(100);
    } catch (error) {
      logger.error(`Failed to process content response for ${contentId}:`, error);
      throw error;
    }
  }

  private async processEscalation(job: Job<{ contentId: string; action: ResponseAction; detectionResult: DetectionResult }>): Promise<void> {
    const { contentId, action, detectionResult } = job.data;

    try {
      await this.handleEscalation(contentId, action, detectionResult);
      job.progress(100);
    } catch (error) {
      logger.error(`Failed to process escalation for ${contentId}:`, error);
      throw error;
    }
  }

  private findApplicableRules(detectionResult: DetectionResult, content: IContent): EscalationRule[] {
    return this.escalationRules.filter(rule => {
      if (!rule.enabled) return false;

      const conditions = rule.conditions;

      if (conditions.harmfulnessScore) {
        if (conditions.harmfulnessScore.min && detectionResult.harmfulnessScore < conditions.harmfulnessScore.min) {
          return false;
        }
        if (conditions.harmfulnessScore.max && detectionResult.harmfulnessScore > conditions.harmfulnessScore.max) {
          return false;
        }
      }

      if (conditions.confidence?.min && detectionResult.confidence < conditions.confidence.min) {
        return false;
      }

      if (conditions.categories && conditions.categories.length > 0) {
        const hasMatchingCategory = conditions.categories.some(cat => 
          detectionResult.categories.includes(cat)
        );
        if (!hasMatchingCategory) return false;
      }

      if (conditions.platforms && conditions.platforms.length > 0) {
        if (!conditions.platforms.includes(content.platform)) {
          return false;
        }
      }

      if (conditions.viralityIndicators) {
        const isViral = this.checkViralityIndicators(content);
        if (!isViral) return false;
      }

      return true;
    }).sort((a, b) => b.priority - a.priority);
  }

  private consolidateActions(rules: EscalationRule[]): ResponseAction[] {
    const actionMap = new Map<string, ResponseAction>();

    for (const rule of rules) {
      for (const action of rule.actions) {
        const key = `${action.type}_${action.severity}`;
        const existing = actionMap.get(key);

        if (!existing || this.getActionPriority(action) > this.getActionPriority(existing)) {
          actionMap.set(key, action);
        }
      }
    }

    return Array.from(actionMap.values()).sort((a, b) => 
      this.getActionPriority(b) - this.getActionPriority(a)
    );
  }

  private async executeAction(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    try {
      switch (action.type) {
        case 'flag':
          await this.flagContent(contentId, action, detectionResult);
          break;
        case 'remove':
          await this.removeContent(contentId, action, detectionResult);
          break;
        case 'escalate':
          await this.escalateToHuman(contentId, action, detectionResult);
          break;
        case 'warn':
          await this.warnUser(contentId, action, detectionResult);
          break;
        case 'quarantine':
          await this.quarantineContent(contentId, action, detectionResult);
          break;
        case 'notify':
          await this.notifyStakeholders(contentId, action, detectionResult);
          break;
        default:
          logger.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      logger.error(`Failed to execute action ${action.type} for content ${contentId}:`, error);
      throw error;
    }
  }

  private async flagContent(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    await Content.findByIdAndUpdate(contentId, {
      $set: {
        'analysisResults.flagged': true,
        'metadata.flags': {
          type: 'automated',
          reason: action.reason,
          severity: action.severity,
          timestamp: new Date(),
        },
      },
    });

    logger.info(`Content flagged: ${contentId} (${action.severity})`);
  }

  private async removeContent(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    if (detectionResult.harmfulnessScore < this.autoActionThreshold) {
      logger.warn(`Content ${contentId} harmfulness score ${detectionResult.harmfulnessScore} below auto-action threshold ${this.autoActionThreshold}, escalating instead`);
      await this.escalateToHuman(contentId, action, detectionResult);
      return;
    }

    await Content.findByIdAndUpdate(contentId, {
      $set: {
        'metadata.removed': true,
        'metadata.removeReason': action.reason,
        'metadata.removedAt': new Date(),
        'metadata.removedBy': 'automated_system',
      },
    });

    logger.warn(`Content removed: ${contentId} (${action.reason})`);
  }

  private async escalateToHuman(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    await this.escalationQueue.add('escalate-content', {
      contentId,
      action,
      detectionResult,
    }, {
      priority: this.getActionPriority(action),
    });

    await Content.findByIdAndUpdate(contentId, {
      $set: {
        'metadata.escalated': true,
        'metadata.escalationReason': action.reason,
        'metadata.escalatedAt': new Date(),
        'metadata.reviewPriority': action.severity,
      },
    });

    logger.info(`Content escalated for human review: ${contentId} (${action.severity})`);
  }

  private async warnUser(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    const content = await Content.findById(contentId);
    if (!content) return;

    await Content.findByIdAndUpdate(contentId, {
      $set: {
        'metadata.userWarned': true,
        'metadata.warningReason': action.reason,
        'metadata.warnedAt': new Date(),
      },
    });

    logger.info(`User warned for content: ${contentId} (${action.reason})`);
  }

  private async quarantineContent(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    await Content.findByIdAndUpdate(contentId, {
      $set: {
        'metadata.quarantined': true,
        'metadata.quarantineReason': action.reason,
        'metadata.quarantinedAt': new Date(),
        'metadata.requiresReview': true,
      },
    });

    logger.info(`Content quarantined: ${contentId} (${action.reason})`);
  }

  private async notifyStakeholders(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    const notification = {
      contentId,
      severity: action.severity,
      categories: detectionResult.categories,
      harmfulnessScore: detectionResult.harmfulnessScore,
      reason: action.reason,
      timestamp: new Date(),
    };

    // Here you would integrate with notification services (Slack, Teams, email, etc.)
    logger.info(`Stakeholder notification sent for content: ${contentId}`, notification);
  }

  private async handleEscalation(contentId: string, action: ResponseAction, detectionResult: DetectionResult): Promise<void> {
    const redis = getRedisClient();
    
    const escalationData = {
      contentId,
      action,
      detectionResult,
      createdAt: new Date(),
      priority: action.severity,
    };

    await redis.lPush(`escalation:${action.severity}`, JSON.stringify(escalationData));
    
    logger.info(`Escalation processed: ${contentId} added to ${action.severity} queue`);
  }

  private determineUrgency(detectionResult: DetectionResult): 'low' | 'medium' | 'high' | 'critical' {
    const score = detectionResult.harmfulnessScore;
    const hasHighRiskCategories = detectionResult.categories.some(cat => 
      ['self_harm', 'violence', 'dangerous_challenge', 'extremism'].includes(cat)
    );

    if (score >= 0.95 || hasHighRiskCategories) return 'critical';
    if (score >= 0.85) return 'high';
    if (score >= 0.7) return 'medium';
    return 'low';
  }

  private getJobPriority(urgency: string): number {
    const priorities = { critical: 1, high: 2, medium: 3, low: 4 };
    return priorities[urgency as keyof typeof priorities] || 4;
  }

  private getActionPriority(action: ResponseAction): number {
    const typePriority = { remove: 5, quarantine: 4, escalate: 3, flag: 2, warn: 1, notify: 1 };
    const severityPriority = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return (typePriority[action.type as keyof typeof typePriority] || 1) * 
           (severityPriority[action.severity as keyof typeof severityPriority] || 1);
  }

  private checkViralityIndicators(content: IContent): boolean {
    const totalEngagement = content.engagement.likes + content.engagement.shares + content.engagement.comments;
    const viralThreshold = 1000;
    
    return totalEngagement > viralThreshold || 
           content.engagement.shares > 100 ||
           (content.engagement.views && content.engagement.views > 10000);
  }

  private async logResponseActions(contentId: string, actions: ResponseAction[], detectionResult: DetectionResult): Promise<void> {
    const logEntry = {
      contentId,
      actions: actions.map(a => ({ type: a.type, severity: a.severity, reason: a.reason })),
      detectionResult: {
        harmfulnessScore: detectionResult.harmfulnessScore,
        categories: detectionResult.categories,
        confidence: detectionResult.confidence,
      },
      timestamp: new Date(),
    };

    const redis = getRedisClient();
    await redis.lPush('response_log', JSON.stringify(logEntry));
    
    logger.info(`Response actions logged for content: ${contentId}`, logEntry);
  }

  private async loadEscalationRules(): Promise<void> {
    try {
      // In a production system, these would be loaded from a database
      this.escalationRules = this.getDefaultEscalationRules();
      logger.info(`Loaded ${this.escalationRules.length} escalation rules`);
    } catch (error) {
      logger.error('Failed to load escalation rules:', error);
      this.escalationRules = this.getDefaultEscalationRules();
    }
  }

  private getDefaultEscalationRules(): EscalationRule[] {
    return [
      {
        id: 'critical_self_harm',
        name: 'Critical Self-Harm Content',
        conditions: {
          categories: ['self_harm'],
          harmfulnessScore: { min: 0.8 },
        },
        actions: [
          { type: 'remove', severity: 'critical', automated: true, reason: 'Self-harm content detected' },
          { type: 'notify', severity: 'critical', automated: true, reason: 'Mental health crisis alert' },
        ],
        priority: 100,
        enabled: true,
      },
      {
        id: 'high_violence_viral',
        name: 'High Violence with Viral Potential',
        conditions: {
          categories: ['violence'],
          harmfulnessScore: { min: 0.75 },
          viralityIndicators: true,
        },
        actions: [
          { type: 'quarantine', severity: 'high', automated: true, reason: 'Violent content with viral potential' },
          { type: 'escalate', severity: 'high', automated: true, reason: 'Human review required for viral violent content' },
        ],
        priority: 90,
        enabled: true,
      },
      {
        id: 'moderate_hate_speech',
        name: 'Moderate Hate Speech',
        conditions: {
          categories: ['hate_speech'],
          harmfulnessScore: { min: 0.6, max: 0.85 },
        },
        actions: [
          { type: 'flag', severity: 'medium', automated: true, reason: 'Hate speech detected' },
          { type: 'warn', severity: 'medium', automated: true, reason: 'Community guidelines violation' },
        ],
        priority: 70,
        enabled: true,
      },
      {
        id: 'dangerous_challenge_tiktok',
        name: 'Dangerous Challenge on TikTok',
        conditions: {
          categories: ['dangerous_challenge'],
          platforms: ['tiktok'],
          harmfulnessScore: { min: 0.7 },
        },
        actions: [
          { type: 'remove', severity: 'high', automated: true, reason: 'Dangerous challenge removed for safety' },
          { type: 'notify', severity: 'high', automated: true, reason: 'Dangerous trend alert' },
        ],
        priority: 85,
        enabled: true,
      },
      {
        id: 'low_confidence_high_harm',
        name: 'Low Confidence High Harm Score',
        conditions: {
          harmfulnessScore: { min: 0.8 },
          confidence: { min: 0.0 },
        },
        actions: [
          { type: 'escalate', severity: 'medium', automated: true, reason: 'Low confidence high harm - needs human review' },
        ],
        priority: 60,
        enabled: true,
      },
    ];
  }

  public async getQueueStats(): Promise<any> {
    const [responseWaiting, responseActive, escalationWaiting, escalationActive] = await Promise.all([
      this.responseQueue.waiting(),
      this.responseQueue.active(),
      this.escalationQueue.waiting(),
      this.escalationQueue.active(),
    ]);

    return {
      response: {
        waiting: responseWaiting.length,
        active: responseActive.length,
      },
      escalation: {
        waiting: escalationWaiting.length,
        active: escalationActive.length,
      },
    };
  }

  public updateEscalationRules(rules: EscalationRule[]): void {
    this.escalationRules = rules;
    logger.info(`Escalation rules updated: ${rules.length} rules loaded`);
  }

  public getEscalationRules(): EscalationRule[] {
    return [...this.escalationRules];
  }
}