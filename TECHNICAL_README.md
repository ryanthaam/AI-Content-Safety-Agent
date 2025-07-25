# Sentinel AI Content Safety Agent - Technical Documentation

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.1+-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

**Comprehensive technical documentation for the production-ready AI-powered content safety system.**

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Sentinel AI Content Safety System                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Admin Panel │    │  Dashboard  │    │ Mobile App  │    │   Web UI    │  │
│  │  (React)    │    │  (React)    │    │  (Native)   │    │  (React)    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│          │                   │                   │                   │      │
│          └───────────────────┼───────────────────┼───────────────────┘      │
│                              │                   │                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                          API Gateway Layer                                  │
│                    Express.js + Socket.IO + CORS                           │
│              Rate Limiting │ Authentication │ Validation                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Core Services Layer                            │   │
│  │                                                                     │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │   │
│  │  │   Content       │    │   Detection     │    │     Trend       │  │   │
│  │  │   Ingestion     │◄──►│    Engine       │◄──►│   Analysis      │  │   │
│  │  │   Service       │    │                 │    │   Service       │  │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │   │
│  │           │                       │                      │           │   │
│  │           ▼                       ▼                      ▼           │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │   │
│  │  │   Platform      │    │     AI/ML       │    │   Automated     │  │   │
│  │  │   Adapters      │    │    Models       │    │   Response      │  │   │
│  │  │                 │    │   Ensemble      │    │   Service       │  │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         AI/ML Model Layer                                   │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │    Text     │  │   Image     │  │   Video     │  │     Audio       │    │
│  │ Classifier  │  │ Classifier  │  │ Classifier  │  │   Classifier    │    │
│  │             │  │             │  │             │  │                 │    │
│  │ • OpenAI    │  │ • OpenAI    │  │ • Frame     │  │ • Speech-to-    │    │
│  │ • BERT      │  │   Vision    │  │   Extract   │  │   Text          │    │
│  │ • Sentiment │  │ • NSFW      │  │ • Analysis  │  │ • Audio         │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘    │
│         │                │                │                    │           │
│         └────────────────┼────────────────┼────────────────────┘           │
│                          │                │                                │
│         ┌────────────────▼────────────────▼─────────────────────┐          │
│         │              Ensemble Classifier                      │          │
│         │         (Weighted Voting + Context Boost)             │          │
│         └─────────────────────────────────────────────────────────┘          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Message Queue Layer                                 │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  Ingestion  │  │ Detection   │  │    Trend    │  │    Response     │    │
│  │   Queue     │  │   Queue     │  │   Analysis  │  │     Queue       │    │
│  │   (Bull)    │  │   (Bull)    │  │   Queue     │  │    (Bull)       │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Data Storage Layer                                  │
│                                                                             │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│  │      MongoDB        │         │             Redis Cluster           │   │
│  │                     │         │                                     │   │
│  │ • Content Storage   │         │ • Session Storage                   │   │
│  │ • User Data         │         │ • Cache Layer                       │   │
│  │ • Analytics Data    │         │ • Queue Storage                     │   │
│  │ • Audit Logs        │         │ • Real-time Data                    │   │
│  │ • Model Results     │         │ • Rate Limiting                     │   │
│  └─────────────────────┘         └─────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                        External Integrations                               │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │   Twitter   │  │  YouTube    │  │ Instagram   │  │    TikTok       │    │
│  │     API     │  │    API      │  │    API      │  │     API         │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘    │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │   OpenAI    │  │ HuggingFace │  │   Slack     │  │     Email       │    │
│  │   GPT-4     │  │ Transformers│  │   Webhook   │  │   Notifications │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Content Processing Pipeline                          │
└─────────────────────────────────────────────────────────────────────────────┘

Platform APIs
     │
     ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Platform   │────►│   Content       │────►│   Ingestion     │
│  Adapters   │     │  Normalization  │     │     Queue       │
└─────────────┘     └─────────────────┘     └─────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Multi-Modal Detection                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Text     │  │   Image     │  │Video/Audio  │         │
│  │ Processing  │  │ Processing  │  │ Processing  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│         ┌─────────────────────────────────────┐             │
│         │        Ensemble Classifier          │             │
│         │     (Weighted Decision Making)      │             │
│         └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────┐     ┌─────────────────┐
│            Trend Analysis               │────►│   Early Warning │
│                                         │     │     System      │
│ • Cross-platform correlation           │     └─────────────────┘
│ • Velocity tracking                     │              │
│ • Pattern recognition                   │              ▼
└─────────────────────────────────────────┘     ┌─────────────────┐
                          │                     │   Automated     │
                          └────────────────────►│   Response      │
                                                │    Engine       │
                                                └─────────────────┘
                                                         │
                                                         ▼
                                    ┌─────────────────────────────────┐
                                    │         Response Actions         │
                                    │                                 │
                                    │ • Flag Content                  │
                                    │ • Remove Content                │
                                    │ • Escalate to Human             │
                                    │ • Send Warnings                 │
                                    │ • Quarantine Account            │
                                    │ • Generate Alerts               │
                                    └─────────────────────────────────┘
```

---

## 🔧 Technology Stack

### Backend Infrastructure
```
Node.js 18+ ──┐
              ├── TypeScript 5.1+
              └── Express.js 4.18+
                      │
                      ├── Socket.IO (Real-time)
                      ├── Helmet (Security)
                      ├── CORS (Cross-origin)
                      └── Joi (Validation)
```

### Data Layer
```
MongoDB 5.7+ ──┐
               ├── Mongoose ODM
               └── GridFS (File Storage)

Redis 6.0+ ────┐
               ├── Bull (Job Queues)
               ├── Session Storage
               └── Caching Layer
```

### AI/ML Stack
```
OpenAI GPT-4 ──┐
               ├── Vision API
               └── Moderation API

HuggingFace ───┐
               ├── BERT Models
               ├── NSFW Detection
               └── Sentiment Analysis

TensorFlow.js ─┐
               ├── Custom Models
               └── Edge Inference
```

### Security & Monitoring
```
Authentication ─┐
                ├── JWT Tokens
                ├── bcryptjs
                └── Rate Limiting

Logging ────────┐
                ├── Winston
                ├── Structured JSON
                └── Error Tracking
```

---

## 📊 Data Models

### Core Content Model

```typescript
interface Content {
  id: string;
  platform: 'twitter' | 'youtube' | 'instagram' | 'tiktok';
  contentType: 'text' | 'image' | 'video' | 'audio';
  originalId: string;
  author: {
    id: string;
    username: string;
    followerCount?: number;
    verificationStatus?: boolean;
  };
  content: {
    text?: string;
    imageUrls?: string[];
    videoUrl?: string;
    audioUrl?: string;
    metadata?: Record<string, any>;
  };
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  };
  timestamps: {
    published: Date;
    ingested: Date;
    lastAnalyzed?: Date;
  };
  location?: {
    country: string;
    region?: string;
    coordinates?: [number, number];
  };
  language: string;
  status: 'pending' | 'analyzing' | 'reviewed' | 'flagged' | 'cleared';
}
```

### Detection Result Model

```typescript
interface DetectionResult {
  contentId: string;
  timestamp: Date;
  overallScore: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  categories: {
    [key in DetectionCategory]: {
      score: number;
      confidence: number;
      evidence: string[];
      modelUsed: string;
    };
  };
  ensembleDetails: {
    textScore?: number;
    imageScore?: number;
    videoScore?: number;
    audioScore?: number;
    contextBoost: number;
    finalWeight: number;
  };
  actionTaken: 'none' | 'flag' | 'remove' | 'escalate' | 'warn';
  humanReviewRequired: boolean;
  processingTime: number;
}
```

### Trend Analysis Model

```typescript
interface TrendAnalysis {
  id: string;
  timeframe: {
    start: Date;
    end: Date;
    duration: number; // in minutes
  };
  platforms: string[];
  trend: {
    category: DetectionCategory;
    keywords: string[];
    hashtags: string[];
    growth: {
      velocity: number; // items per minute
      acceleration: number;
      peakTime?: Date;
    };
    geographic: {
      regions: string[];
      hotspots: Array<{
        location: string;
        intensity: number;
      }>;
    };
  };
  riskAssessment: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    spreadPotential: number;
    harmPotential: number;
    responseUrgency: 'monitor' | 'alert' | 'immediate';
  };
  correlations: Array<{
    platform: string;
    similarity: number;
    timeOffset: number;
  }>;
  samples: string[]; // Content IDs
}
```

---

## 🚀 API Reference

### Authentication

All API endpoints require authentication via JWT token:

```bash
# Login to get token
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "id": "user123",
    "username": "admin",
    "role": "administrator"
  }
}

# Use token in subsequent requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Content Management Endpoints

#### List Content with Advanced Filtering

```bash
GET /api/v1/content?platform=twitter&category=hate_speech&limit=50&offset=0&sortBy=timestamp&order=desc

# Query Parameters:
# - platform: twitter | youtube | instagram | tiktok
# - category: hate_speech | cyberbullying | self_harm | violence | sexual_content | dangerous_challenge | misinformation | extremism
# - status: pending | analyzing | reviewed | flagged | cleared
# - riskLevel: low | medium | high | critical
# - dateFrom: ISO date string
# - dateTo: ISO date string
# - limit: number (default: 20, max: 100)
# - offset: number (default: 0)
# - sortBy: timestamp | engagement | riskScore
# - order: asc | desc

# Response
{
  "data": [
    {
      "id": "content123",
      "platform": "twitter",
      "contentType": "text",
      "author": {
        "username": "user123",
        "followerCount": 1500
      },
      "content": {
        "text": "Sample content..."
      },
      "detectionResult": {
        "overallScore": 0.85,
        "overallRisk": "high",
        "categories": {
          "hate_speech": {
            "score": 0.92,
            "confidence": 0.89
          }
        }
      },
      "timestamps": {
        "published": "2025-07-25T10:30:00Z",
        "ingested": "2025-07-25T10:31:00Z"
      }
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "pages": 63,
    "limit": 20
  }
}
```

#### Analyze Specific Content

```bash
POST /api/v1/content/content123/analyze
Content-Type: application/json

{
  "forceReanalysis": true,
  "models": ["text", "ensemble"], // Optional: specify which models to run
  "priority": "high" // low | medium | high
}

# Response
{
  "contentId": "content123",
  "status": "completed",
  "result": {
    "overallScore": 0.85,
    "overallRisk": "high",
    "categories": {
      "hate_speech": {
        "score": 0.92,
        "confidence": 0.89,
        "evidence": ["racial slur detected", "aggressive language patterns"],
        "modelUsed": "openai-moderation-v1"
      }
    },
    "processingTime": 150,
    "actionTaken": "flag",
    "humanReviewRequired": true
  }
}
```

#### Batch Content Analysis

```bash
POST /api/v1/content/batch-analyze
Content-Type: application/json

{
  "contentIds": ["content123", "content124", "content125"],
  "priority": "medium",
  "models": ["text", "image", "ensemble"]
}

# Response
{
  "batchId": "batch456",
  "status": "queued",
  "totalItems": 3,
  "estimatedCompletionTime": "2025-07-25T10:35:00Z",
  "results": [] // Will be populated as analysis completes
}

# Check batch status
GET /api/v1/content/batch-analyze/batch456

{
  "batchId": "batch456",
  "status": "completed",
  "totalItems": 3,
  "completedItems": 3,
  "results": [
    {
      "contentId": "content123",
      "status": "completed",
      "result": { /* detection result */ }
    }
  ]
}
```

### Trend Analysis Endpoints

#### Get Current Trending Summary

```bash
GET /api/v1/analysis/trends?timeframe=1h&platforms=twitter,youtube&riskLevel=high

# Query Parameters:
# - timeframe: 15m | 1h | 6h | 24h | 7d
# - platforms: comma-separated list
# - riskLevel: low | medium | high | critical
# - category: specific detection category
# - limit: number of trends to return

# Response
{
  "timeframe": {
    "duration": "1h",
    "start": "2025-07-25T09:30:00Z",
    "end": "2025-07-25T10:30:00Z"
  },
  "summary": {
    "totalTrends": 15,
    "highRiskTrends": 3,
    "newTrends": 7,
    "escalatingTrends": 2
  },
  "trends": [
    {
      "id": "trend789",
      "category": "dangerous_challenge",
      "keywords": ["viral challenge", "dangerous stunt"],
      "platforms": ["tiktok", "instagram"],
      "riskLevel": "critical",
      "growth": {
        "velocity": 45.2,
        "acceleration": 12.8
      },
      "contentCount": 1850,
      "engagementTotal": 125000,
      "firstDetected": "2025-07-25T09:45:00Z"
    }
  ]
}
```

#### Trigger Manual Trend Analysis

```bash
POST /api/v1/analysis/trends/analyze
Content-Type: application/json

{
  "timeframe": "1h",
  "platforms": ["twitter", "youtube"],
  "priority": "high",
  "categories": ["hate_speech", "dangerous_challenge"]
}

# Response
{
  "analysisId": "analysis123",
  "status": "queued",
  "estimatedCompletionTime": "2025-07-25T10:35:00Z",
  "parameters": {
    "timeframe": "1h",
    "platforms": ["twitter", "youtube"]
  }
}
```

### Alert Management Endpoints

#### List Alerts with Filtering

```bash
GET /api/v1/alerts?severity=high&status=open&limit=20

# Query Parameters:
# - severity: low | medium | high | critical
# - status: open | acknowledged | resolved | false_positive
# - category: detection category
# - platform: specific platform
# - dateFrom: ISO date string
# - dateTo: ISO date string

# Response
{
  "alerts": [
    {
      "id": "alert456",
      "severity": "critical",
      "status": "open",
      "category": "dangerous_challenge",
      "title": "Viral dangerous challenge detected",
      "description": "Rapid spread of harmful challenge across TikTok and Instagram",
      "platforms": ["tiktok", "instagram"],
      "metrics": {
        "contentCount": 1850,
        "growth": 45.2,
        "estimatedReach": 2500000
      },
      "actions": {
        "recommended": ["immediate_escalation", "platform_notification"],
        "taken": []
      },
      "timestamps": {
        "created": "2025-07-25T10:15:00Z",
        "lastUpdated": "2025-07-25T10:20:00Z"
      },
      "assignee": null,
      "priority": "urgent"
    }
  ]
}
```

#### Acknowledge Alert

```bash
POST /api/v1/alerts/alert456/acknowledge
Content-Type: application/json

{
  "acknowledgedBy": "admin123",
  "comment": "Investigating with platform partners",
  "action": "escalate_to_platforms",
  "estimatedResolutionTime": "2025-07-25T11:00:00Z"
}

# Response
{
  "alertId": "alert456",
  "status": "acknowledged",
  "acknowledgedBy": "admin123",
  "acknowledgedAt": "2025-07-25T10:25:00Z",
  "comment": "Investigating with platform partners"
}
```

### Dashboard & Metrics Endpoints

#### System Overview Dashboard

```bash
GET /api/v1/dashboard/overview

# Response
{
  "systemStatus": {
    "status": "operational",
    "uptime": "99.95%",
    "lastIncident": "2025-07-20T15:30:00Z"
  },
  "processing": {
    "contentIngested24h": 2450000,
    "contentAnalyzed24h": 2448500,
    "averageProcessingTime": 85, // milliseconds
    "queueBacklog": 1500
  },
  "detection": {
    "flaggedContent24h": 12750,
    "highRiskContent": 285,
    "falsePositiveRate": 2.1,
    "accuracyRate": 96.2
  },
  "trends": {
    "activeTrends": 23,
    "highRiskTrends": 3,
    "newTrendsToday": 15,
    "averageDetectionTime": 12 // minutes
  },
  "alerts": {
    "openAlerts": 7,
    "criticalAlerts": 1,
    "averageResponseTime": "8m 32s"
  },
  "platforms": {
    "twitter": { "status": "operational", "contentIngested": 1200000 },
    "youtube": { "status": "operational", "contentIngested": 450000 },
    "instagram": { "status": "degraded", "contentIngested": 380000 },
    "tiktok": { "status": "operational", "contentIngested": 420000 }
  }
}
```

#### Real-time Metrics Stream

```bash
# WebSocket connection
ws://localhost:3000/api/v1/dashboard/realtime

# Subscribe to metrics updates
{
  "action": "subscribe",
  "metrics": ["processing", "detection", "alerts"]
}

# Real-time updates received:
{
  "type": "metrics_update",
  "timestamp": "2025-07-25T10:30:00Z",
  "data": {
    "processing": {
      "queueSize": 1485,
      "processingRate": 125.5,
      "averageLatency": 82
    }
  }
}
```

---

## 🔧 Configuration & Environment

### Environment Variables

```bash
# Core Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/sentinel-ai
MONGODB_DB_NAME=sentinel-ai
MONGODB_OPTIONS='{"maxPoolSize": 10, "serverSelectionTimeoutMS": 5000}'

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_KEY_PREFIX=sentinel:

# Authentication & Security
JWT_SECRET=your-super-secure-jwt-secret-key-256-bits
JWT_EXPIRY=24h
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_FAILED_REQUESTS=true

# AI/ML API Keys
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORG_ID=org-your-organization-id
HUGGINGFACE_API_KEY=hf_your-huggingface-token

# Platform API Keys
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-twitter-access-token
TWITTER_ACCESS_SECRET=your-twitter-access-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

YOUTUBE_API_KEY=your-youtube-api-key
INSTAGRAM_API_KEY=your-instagram-api-key
INSTAGRAM_API_SECRET=your-instagram-api-secret
TIKTOK_API_KEY=your-tiktok-api-key

# Detection Thresholds
HARMFUL_CONTENT_THRESHOLD=0.85
TREND_DETECTION_THRESHOLD=0.75
AUTO_ACTION_THRESHOLD=0.95
HUMAN_REVIEW_THRESHOLD=0.60

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_JOBS=1000
QUEUE_DEFAULT_JOB_OPTIONS='{"removeOnComplete": 100, "removeOnFail": 50}'

# Monitoring & Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-email-password

# File Storage
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,video/mp4,audio/mp3

# Performance Tuning
NODE_OPTIONS=--max-old-space-size=4096
UV_THREADPOOL_SIZE=64
```

### Configuration Files

#### `config/detection.json`
```json
{
  "categories": {
    "hate_speech": {
      "enabled": true,
      "threshold": 0.85,
      "autoAction": "flag",
      "humanReview": true,
      "models": ["openai", "bert", "sentiment"]
    },
    "cyberbullying": {
      "enabled": true,
      "threshold": 0.80,
      "autoAction": "flag",
      "humanReview": true,
      "models": ["openai", "bert"]
    },
    "dangerous_challenge": {
      "enabled": true,
      "threshold": 0.75,
      "autoAction": "escalate",
      "humanReview": true,
      "models": ["openai", "custom"]
    }
  },
  "ensemble": {
    "weights": {
      "text": 0.4,
      "image": 0.3,
      "video": 0.2,
      "audio": 0.1
    },
    "contextBoost": 0.15,
    "minimumAgreement": 0.6
  }
}
```

#### `config/platforms.json`
```json
{
  "twitter": {
    "enabled": true,
    "rateLimits": {
      "requestsPerWindow": 300,
      "windowDuration": 900000
    },
    "polling": {
      "interval": 30000,
      "maxResults": 100
    },
    "endpoints": {
      "search": "https://api.twitter.com/2/tweets/search/recent",
      "user": "https://api.twitter.com/2/users/by/username"
    }
  },
  "youtube": {
    "enabled": true,
    "rateLimits": {
      "requestsPerWindow": 100,
      "windowDuration": 100000
    },
    "polling": {
      "interval": 60000,
      "maxResults": 50
    }
  }
}
```

---

## 🚀 Development Setup

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **MongoDB**: 5.7 or higher
- **Redis**: 6.0 or higher
- **Git**: Latest version

### Quick Setup Script

```bash
#!/bin/bash
# setup.sh

echo "🚀 Setting up Sentinel AI Development Environment..."

# Check Node.js version
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo "❌ Node.js 18+ is required"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment file
if [ ! -f .env ]; then
    echo "⚙️ Creating environment file..."
    cp .env.example .env
    echo "✏️ Please edit .env with your configuration"
fi

# Setup MongoDB
echo "🗄️ Setting up MongoDB..."
if command -v mongod &> /dev/null; then
    mkdir -p data/db
    echo "MongoDB ready. Start with: mongod --dbpath ./data/db"
else
    echo "⚠️ MongoDB not found. Please install MongoDB"
fi

# Setup Redis
echo "📮 Checking Redis..."
if command -v redis-server &> /dev/null; then
    echo "Redis ready. Start with: redis-server"
else
    echo "⚠️ Redis not found. Please install Redis"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo "✅ Setup complete! Run 'npm run dev' to start development server"
```

### Development Workflow

```bash
# 1. Start infrastructure services
mongod --dbpath ./data/db &
redis-server &

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start development server
npm run dev

# 5. Run tests
npm test

# 6. Build for production
npm run build
npm start
```

### Code Quality Tools

```bash
# TypeScript compilation check
npm run typecheck

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests with coverage
npm run test:coverage

# Format code (if Prettier is configured)
npm run format
```

---

## 🧪 Testing Strategy

### Test Structure

```
tests/
├── unit/                 # Unit tests (70% coverage target)
│   ├── services/
│   │   ├── ContentIngestionService.test.ts
│   │   ├── ContentDetectionService.test.ts
│   │   └── TrendAnalysisService.test.ts
│   ├── models/
│   │   └── detectors/
│   │       ├── TextClassifier.test.ts
│   │       └── EnsembleClassifier.test.ts
│   └── utils/
│       └── logger.test.ts
├── integration/          # Integration tests (API endpoints)
│   ├── api/
│   │   ├── content.test.ts
│   │   ├── analysis.test.ts
│   │   └── alerts.test.ts
│   └── services/
│       └── end-to-end-workflow.test.ts
├── load/                # Load testing
│   ├── content-ingestion.test.js
│   └── detection-performance.test.js
├── e2e/                 # End-to-end tests
│   ├── user-workflows.test.ts
│   └── system-integration.test.ts
└── fixtures/            # Test data
    ├── sample-content.json
    └── mock-responses.json
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern=unit/services

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run load tests
npm run test:load

# Run e2e tests
npm run test:e2e
```

### Mock Data & Testing

```typescript
// tests/fixtures/mockContent.ts
export const mockTwitterContent = {
  id: 'test-content-123',
  platform: 'twitter' as const,
  contentType: 'text' as const,
  originalId: 'tweet-123',
  author: {
    id: 'user-123',
    username: 'testuser',
    followerCount: 1000
  },
  content: {
    text: 'This is a test tweet for harmful content detection'
  },
  engagement: {
    likes: 10,
    shares: 2,
    comments: 5
  },
  timestamps: {
    published: new Date('2025-07-25T10:00:00Z'),
    ingested: new Date('2025-07-25T10:01:00Z')
  },
  language: 'en',
  status: 'pending' as const
};

// Unit test example
describe('ContentDetectionService', () => {
  let service: ContentDetectionService;
  
  beforeEach(() => {
    service = new ContentDetectionService();
  });

  describe('analyzeContent', () => {
    it('should detect harmful content correctly', async () => {
      const result = await service.analyzeContent(mockTwitterContent);
      
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.categories).toHaveProperty('hate_speech');
      expect(result.processingTime).toBeLessThan(1000);
    });
  });
});
```

---

## 🐳 Docker & Deployment

### Docker Compose Setup

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  sentinel-ai:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/sentinel-ai
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    volumes:
      - ../logs:/app/logs
    restart: unless-stopped

  mongodb:
    image: mongo:5.7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    environment:
      - MONGO_INITDB_DATABASE=sentinel-ai
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - sentinel-ai
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

### Production Dockerfile

```dockerfile
# docker/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
```

### Deployment Commands

```bash
# Build and deploy locally
docker-compose -f docker/docker-compose.yml up -d

# Production deployment
docker build -f docker/Dockerfile -t sentinel-ai:latest .
docker run -d \
  --name sentinel-ai-prod \
  --env-file .env.production \
  -p 3000:3000 \
  sentinel-ai:latest

# Health check
curl http://localhost:3000/health

# View logs
docker logs -f sentinel-ai-prod

# Stop and cleanup
docker stop sentinel-ai-prod
docker rm sentinel-ai-prod
```

---

## 📊 Monitoring & Observability

### Health Monitoring

```typescript
// src/api/routes/health.ts
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    queues: 'operational' | 'backlogged' | 'failed';
    externalAPIs: Record<string, 'operational' | 'degraded' | 'down'>;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeConnections: number;
    queueBacklog: number;
  };
}
```

### Structured Logging

```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sentinel-ai',
    version: process.env.npm_package_version
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10
    })
  ]
});

// Log structured events
logger.info('Content analyzed', {
  contentId: 'content123',
  platform: 'twitter',
  detectionResult: {
    overallScore: 0.85,
    categories: ['hate_speech'],
    processingTime: 150
  },
  userId: 'admin123'
});
```

### Performance Metrics

```typescript
// Key metrics tracked
interface SystemMetrics {
  processing: {
    itemsPerSecond: number;
    averageLatency: number;
    queueBacklog: number;
    errorRate: number;
  };
  detection: {
    accuracyRate: number;
    falsePositiveRate: number;
    modelPerformance: Record<string, number>;
  };
  resources: {
    cpuUtilization: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  };
  business: {
    contentFlagged: number;
    trendsDetected: number;
    alertsGenerated: number;
    humanReviewsCompleted: number;
  };
}
```

---

## 🔒 Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Network Security                        │   │
│  │                                                     │   │
│  │  • HTTPS/TLS 1.3                                   │   │
│  │  • Rate Limiting                                   │   │
│  │  • DDoS Protection                                 │   │
│  │  • IP Whitelisting                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Application Security                       │   │
│  │                                                     │   │
│  │  • JWT Authentication                              │   │
│  │  • Role-Based Access Control                       │   │
│  │  • Input Validation & Sanitization                 │   │
│  │  • CORS Configuration                              │   │
│  │  • Security Headers (Helmet)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Data Security                           │   │
│  │                                                     │   │
│  │  • Encryption at Rest (MongoDB)                    │   │
│  │  • Encryption in Transit (TLS)                     │   │
│  │  • Password Hashing (bcrypt)                       │   │
│  │  • Sensitive Data Masking                          │   │
│  │  • No PII Storage                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Operational Security                      │   │
│  │                                                     │   │
│  │  • Audit Logging                                   │   │
│  │  • Security Monitoring                             │   │
│  │  • Vulnerability Scanning                          │   │
│  │  • Incident Response                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Authentication & Authorization

```typescript
// JWT Token Structure
interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'moderator' | 'analyst' | 'viewer';
  permissions: string[];
  iat: number;
  exp: number;
}

// Role-based permissions
const PERMISSIONS = {
  admin: [
    'content:read',
    'content:write',
    'content:delete',
    'analysis:read',
    'analysis:write',
    'alerts:read',
    'alerts:write',
    'users:read',
    'users:write',
    'system:read',
    'system:write'
  ],
  moderator: [
    'content:read',
    'content:write',
    'analysis:read',
    'alerts:read',
    'alerts:write'
  ],
  analyst: [
    'content:read',
    'analysis:read',
    'alerts:read'
  ],
  viewer: [
    'content:read',
    'analysis:read'
  ]
};
```

### Data Privacy & Compliance

```typescript
// Data handling policies
interface DataPolicy {
  retention: {
    contentMetadata: '90 days';
    detectionResults: '1 year';
    auditLogs: '7 years';
    userSessions: '24 hours';
  };
  encryption: {
    atRest: 'AES-256';
    inTransit: 'TLS 1.3';
    keys: 'HSM or AWS KMS';
  };
  privacy: {
    piiHandling: 'no collection';
    anonymization: 'automatic';
    rightToDelete: 'supported';
    dataExport: 'on request';
  };
}
```

---

## 🚨 Troubleshooting Guide

### Common Issues

#### 1. High Memory Usage

**Symptoms:**
- Server becomes unresponsive
- Out of memory errors
- Slow API responses

**Diagnosis:**
```bash
# Check memory usage
docker stats sentinel-ai
htop

# Check Node.js heap usage
curl http://localhost:3000/api/v1/dashboard/metrics | jq '.system.memory'
```

**Solutions:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=4096 --gc-interval=100"

# Monitor for memory leaks
npm install -g clinic
clinic doctor -- node dist/index.js
```

#### 2. Queue Processing Delays

**Symptoms:**
- Content analysis takes too long
- Queue backlog grows continuously
- Real-time updates delayed

**Diagnosis:**
```bash
# Check queue status
curl http://localhost:3000/api/v1/content/ingestion/stats

# Check Redis memory usage
redis-cli info memory

# Monitor queue processing
curl http://localhost:3000/api/v1/dashboard/metrics | jq '.queues'
```

**Solutions:**
```bash
# Increase queue concurrency
export QUEUE_CONCURRENCY=10

# Scale horizontally
docker-compose up --scale sentinel-ai=3

# Clear stuck jobs
redis-cli del bull:detection:*
```

#### 3. Detection Accuracy Issues

**Symptoms:**
- High false positive rates
- Missing harmful content
- Inconsistent results

**Diagnosis:**
```bash
# Review detection logs
grep "detection_result" logs/combined.log | tail -100

# Check model performance
curl http://localhost:3000/api/v1/dashboard/metrics | jq '.detection'

# Analyze specific content
curl -X POST http://localhost:3000/api/v1/content/content123/analyze
```

**Solutions:**
```bash
# Adjust thresholds
export HARMFUL_CONTENT_THRESHOLD=0.8

# Retrain models with new data
npm run scripts:retrain-models

# Review ensemble weights
# Edit config/detection.json
```

#### 4. API Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests errors
- Platform API failures
- Incomplete data collection

**Diagnosis:**
```bash
# Check rate limit status
curl http://localhost:3000/api/v1/dashboard/platforms

# Review API logs
grep "rate_limit" logs/combined.log
```

**Solutions:**
```bash
# Increase rate limits (if possible)
export RATE_LIMIT_MAX_REQUESTS=200

# Implement backoff strategies
export PLATFORM_RETRY_DELAY=5000

# Use multiple API keys
export TWITTER_API_KEY_2=your-backup-key
```

### Performance Optimization

#### Database Optimization

```javascript
// MongoDB indexes for better performance
db.content.createIndex({ platform: 1, "timestamps.ingested": -1 });
db.content.createIndex({ "detectionResult.overallRisk": 1 });
db.content.createIndex({ "timestamps.published": -1, platform: 1 });
db.trends.createIndex({ "timeframe.start": -1, "riskAssessment.severity": 1 });

// MongoDB optimization settings
db.adminCommand({
  setParameter: 1,
  internalQueryExecMaxBlockingSortBytes: 335544320
});
```

#### Redis Optimization

```bash
# Redis configuration optimization
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET save ""  # Disable snapshotting for performance
```

#### Application Tuning

```bash
# Node.js optimization
export UV_THREADPOOL_SIZE=64
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"

# Enable HTTP/2
export HTTP2_ENABLED=true

# Optimize garbage collection
export NODE_OPTIONS="${NODE_OPTIONS} --expose-gc --gc-interval=100"
```

### Monitoring Scripts

```bash
#!/bin/bash
# scripts/health-check.sh

echo "🔍 Sentinel AI Health Check"
echo "=========================="

# Check application health
HEALTH=$(curl -s http://localhost:3000/health)
if [[ $? -eq 0 ]]; then
    echo "✅ Application: $(echo $HEALTH | jq -r '.status')"
else
    echo "❌ Application: Unreachable"
fi

# Check database
mongo --eval "db.adminCommand('ismaster')" --quiet && echo "✅ MongoDB: Connected" || echo "❌ MongoDB: Disconnected"

# Check Redis
redis-cli ping > /dev/null && echo "✅ Redis: Connected" || echo "❌ Redis: Disconnected"

# Check queue status
QUEUE_STATS=$(curl -s http://localhost:3000/api/v1/content/ingestion/stats)
QUEUE_SIZE=$(echo $QUEUE_STATS | jq -r '.backlog')
echo "📊 Queue Backlog: $QUEUE_SIZE items"

# Check memory usage
MEMORY=$(ps -o pid,vsz,rss,comm -p $(pgrep node))
echo "💾 Memory Usage:"
echo "$MEMORY"
```

---

## 🗺️ Roadmap & Future Enhancements

### Phase 2 - Enhanced Intelligence (Q4 2025)

**Advanced ML Capabilities**
- Online learning and model adaptation
- Cross-platform content correlation
- Advanced NLP with context understanding
- Video/audio analysis improvements

**Scale & Performance**
- 5M+ items/hour processing capacity
- Global deployment architecture
- Advanced caching strategies
- Real-time model updates

**Enhanced Interfaces**
- Mobile application for moderators
- Advanced analytics dashboard
- Customizable alert systems
- API rate limiting improvements

### Phase 3 - Platform Expansion (Q1 2026)

**New Platform Integrations**
- Discord, Telegram, Snapchat
- LinkedIn, Reddit, Twitch
- Emerging social platforms
- Custom platform adapters

**Advanced Analytics**
- Predictive trend modeling
- Network analysis capabilities
- Demographic insights
- Behavioral pattern recognition

**Collaboration Features**
- Multi-team coordination
- Shared case management
- Cross-organization alerts
- Industry threat sharing

### Phase 4 - Enterprise & Compliance (Q2 2026)

**Enterprise Security**
- SOC 2 Type II compliance
- GDPR compliance features
- Advanced audit capabilities
- Single sign-on integration

**Advanced Customization**
- Custom detection models
- Configurable workflows
- White-label solutions
- API marketplace

**Partner Ecosystem**
- Platform API partnerships
- Third-party integrations
- Consulting services
- Training programs

---

## 📞 Support & Resources

### Documentation Links
- 📖 [API Documentation](https://docs.sentinel-ai.com/api)
- 🏗️ [Architecture Guide](https://docs.sentinel-ai.com/architecture)
- 🚀 [Deployment Guide](https://docs.sentinel-ai.com/deployment)
- 🧪 [Testing Guide](https://docs.sentinel-ai.com/testing)

### Community & Support
- 💬 [Discord Community](https://discord.gg/sentinel-ai)
- 🐛 [GitHub Issues](https://github.com/your-org/AI-Content-Safety-Agent/issues)
- 📧 [Email Support](mailto:support@sentinel-ai.com)
- 📚 [Knowledge Base](https://support.sentinel-ai.com)

### Contributing
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)
- 🔧 [Development Setup](docs/development.md)
- 📝 [Code Style Guide](docs/style-guide.md)
- 🧪 [Testing Standards](docs/testing.md)

---

## 📄 License & Credits

**License:** MIT License - see [LICENSE](LICENSE) file for details

**Credits:**
- **Lead Developer:** Ryan Tham
- **AI/ML Consultants:** OpenAI, HuggingFace Community
- **Security Review:** [Security Partner]
- **Performance Testing:** [Performance Partner]

**Acknowledgments:**
- OpenAI for GPT-4 and Vision API
- HuggingFace for transformer models and community
- MongoDB and Redis teams for excellent databases
- The Node.js and TypeScript communities
- All contributors and beta testers

---

*🛡️ Built with ❤️ for a safer internet - Protecting digital communities through intelligent content safety*

**Version:** 2.0.0  
**Last Updated:** July 25, 2025  
**Next Review:** August 25, 2025