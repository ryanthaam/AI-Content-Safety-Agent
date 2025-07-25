# Sentinel AI - API Documentation

## Overview

The Sentinel AI Content Safety Agent provides a comprehensive REST API for content analysis, trend detection, alert management, and system monitoring. This documentation covers all available endpoints with detailed examples, request/response schemas, and authentication requirements.

## Base URL

```
Production: https://api.sentinel-ai.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All API endpoints require authentication via JWT token obtained through the authentication endpoint.

### Authentication Flow

```bash
# 1. Login to get JWT token
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}

# Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "user": {
      "id": "user_123",
      "username": "admin",
      "role": "administrator",
      "permissions": ["content:read", "content:write", "analysis:read"]
    }
  }
}

# 2. Use token in subsequent requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials provided",
    "timestamp": "2025-07-25T10:30:00Z"
  }
}
```

## Content Management API

### List Content

Retrieve content items with advanced filtering and pagination.

```bash
GET /content
```

#### Query Parameters

| Parameter | Type | Description | Default | Example |
|-----------|------|-------------|---------|---------|
| `platform` | string | Filter by platform | - | `twitter` |
| `category` | string | Filter by detection category | - | `hate_speech` |
| `status` | string | Filter by processing status | - | `flagged` |
| `riskLevel` | string | Filter by risk level | - | `high` |
| `dateFrom` | string | Start date (ISO 8601) | - | `2025-07-25T00:00:00Z` |
| `dateTo` | string | End date (ISO 8601) | - | `2025-07-25T23:59:59Z` |
| `limit` | number | Items per page | 20 | `50` |
| `offset` | number | Items to skip | 0 | `100` |
| `sortBy` | string | Sort field | `timestamp` | `riskScore` |
| `order` | string | Sort order | `desc` | `asc` |

#### Example Request

```bash
curl -X GET "https://api.sentinel-ai.com/v1/content?platform=twitter&category=hate_speech&riskLevel=high&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "content_123",
        "platform": "twitter",
        "contentType": "text",
        "originalId": "tweet_456789",
        "author": {
          "id": "user_789",
          "username": "example_user",
          "followerCount": 1500,
          "verificationStatus": false
        },
        "content": {
          "text": "This is harmful content that was detected...",
          "language": "en"
        },
        "engagement": {
          "likes": 25,
          "shares": 8,
          "comments": 12,
          "views": 450
        },
        "timestamps": {
          "published": "2025-07-25T10:15:00Z",
          "ingested": "2025-07-25T10:16:30Z",
          "lastAnalyzed": "2025-07-25T10:17:00Z"
        },
        "location": {
          "country": "US",
          "region": "California"
        },
        "detectionResult": {
          "overallScore": 0.87,
          "overallRisk": "high",
          "confidence": 0.92,
          "categories": {
            "hate_speech": {
              "score": 0.91,
              "confidence": 0.89,
              "evidence": ["racial slur detected", "aggressive language patterns"],
              "modelUsed": "openai-moderation-v1"
            },
            "cyberbullying": {
              "score": 0.23,
              "confidence": 0.45,
              "evidence": [],
              "modelUsed": "bert-cyberbullying-v2"
            }
          },
          "processingTime": 145,
          "actionTaken": "flag",
          "humanReviewRequired": true
        },
        "status": "flagged"
      }
    ],
    "pagination": {
      "total": 1247,
      "page": 1,
      "pages": 125,
      "limit": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get Specific Content

Retrieve detailed information about a specific content item.

```bash
GET /content/{contentId}
```

#### Example Request

```bash
curl -X GET "https://api.sentinel-ai.com/v1/content/content_123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "content_123",
    "platform": "twitter",
    "contentType": "text",
    "originalId": "tweet_456789",
    "author": {
      "id": "user_789",
      "username": "example_user",
      "followerCount": 1500,
      "verificationStatus": false,
      "accountAge": "2 years",
      "previousViolations": 2
    },
    "content": {
      "text": "This is harmful content that was detected...",
      "language": "en",
      "metadata": {
        "hashtags": ["#harmful", "#content"],
        "mentions": ["@mentioned_user"],
        "urls": ["https://example.com/link"]
      }
    },
    "engagement": {
      "likes": 25,
      "shares": 8,
      "comments": 12,
      "views": 450,
      "engagementRate": 0.10
    },
    "timestamps": {
      "published": "2025-07-25T10:15:00Z",
      "ingested": "2025-07-25T10:16:30Z",
      "lastAnalyzed": "2025-07-25T10:17:00Z"
    },
    "location": {
      "country": "US",
      "region": "California",
      "coordinates": [-122.4194, 37.7749]
    },
    "detectionResult": {
      "overallScore": 0.87,
      "overallRisk": "high",
      "confidence": 0.92,
      "categories": {
        "hate_speech": {
          "score": 0.91,
          "confidence": 0.89,
          "evidence": ["racial slur detected", "aggressive language patterns"],
          "modelUsed": "openai-moderation-v1",
          "processingTime": 87
        }
      },
      "ensembleDetails": {
        "textScore": 0.91,
        "imageScore": null,
        "videoScore": null,
        "audioScore": null,
        "contextBoost": 0.15,
        "finalWeight": 0.87
      },
      "processingTime": 145,
      "actionTaken": "flag",
      "humanReviewRequired": true,
      "reviewHistory": [
        {
          "timestamp": "2025-07-25T10:17:00Z",
          "action": "flagged_by_system",
          "confidence": 0.87
        }
      ]
    },
    "status": "flagged",
    "relatedContent": [
      {
        "id": "content_124",
        "similarity": 0.85,
        "relationship": "same_author"
      }
    ]
  }
}
```

### Analyze Content

Trigger analysis for specific content or re-analyze existing content.

```bash
POST /content/{contentId}/analyze
```

#### Request Body

```json
{
  "forceReanalysis": true,
  "models": ["text", "ensemble"],
  "priority": "high",
  "options": {
    "includeContext": true,
    "detailedEvidence": true
  }
}
```

#### Example Request

```bash
curl -X POST "https://api.sentinel-ai.com/v1/content/content_123/analyze" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "forceReanalysis": true,
    "models": ["text", "image", "ensemble"],
    "priority": "high"
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_789",
    "contentId": "content_123",
    "status": "completed",
    "startTime": "2025-07-25T10:20:00Z",
    "completionTime": "2025-07-25T10:20:02Z",
    "result": {
      "overallScore": 0.89,
      "overallRisk": "high",
      "confidence": 0.94,
      "categories": {
        "hate_speech": {
          "score": 0.92,
          "confidence": 0.91,
          "evidence": [
            "Racial slur: 'offensive_term' detected at position 15-28",
            "Aggressive language pattern: threatening tone identified",
            "Context analysis: reply to inflammatory post increases severity"
          ],
          "modelUsed": "openai-moderation-v1",
          "processingTime": 89
        },
        "violence": {
          "score": 0.34,
          "confidence": 0.67,
          "evidence": [
            "Implicit threat detected: 'you'll regret this'"
          ],
          "modelUsed": "bert-violence-v3",
          "processingTime": 45
        }
      },
      "ensembleDetails": {
        "individualScores": {
          "text": 0.92,
          "image": null,
          "video": null,
          "audio": null
        },
        "weights": {
          "text": 1.0,
          "image": 0.0,
          "video": 0.0,
          "audio": 0.0
        },
        "contextBoost": 0.15,
        "finalScore": 0.89
      },
      "processingTime": 158,
      "recommendedAction": "flag_for_review",
      "humanReviewRequired": true,
      "metadata": {
        "modelVersions": {
          "openai": "v1.2.0",
          "bert": "v3.1.0",
          "ensemble": "v2.0.0"
        },
        "processingNode": "worker-node-3",
        "queueWaitTime": 12
      }
    }
  }
}
```

### Batch Content Analysis

Analyze multiple content items in a single request.

```bash
POST /content/batch-analyze
```

#### Request Body

```json
{
  "contentIds": ["content_123", "content_124", "content_125"],
  "priority": "medium",
  "models": ["text", "image", "ensemble"],
  "options": {
    "includeContext": true,
    "parallelProcessing": true
  }
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "batchId": "batch_456",
    "status": "processing",
    "totalItems": 3,
    "completedItems": 0,
    "estimatedCompletionTime": "2025-07-25T10:25:00Z",
    "results": [],
    "progress": {
      "queued": 3,
      "processing": 0,
      "completed": 0,
      "failed": 0
    }
  }
}
```

#### Check Batch Status

```bash
GET /content/batch-analyze/{batchId}
```

```json
{
  "success": true,
  "data": {
    "batchId": "batch_456",
    "status": "completed",
    "totalItems": 3,
    "completedItems": 3,
    "startTime": "2025-07-25T10:20:00Z",
    "completionTime": "2025-07-25T10:22:30Z",
    "results": [
      {
        "contentId": "content_123",
        "status": "completed",
        "processingTime": 145,
        "result": {
          "overallScore": 0.87,
          "overallRisk": "high"
        }
      },
      {
        "contentId": "content_124",
        "status": "completed", 
        "processingTime": 89,
        "result": {
          "overallScore": 0.12,
          "overallRisk": "low"
        }
      },
      {
        "contentId": "content_125",
        "status": "failed",
        "error": "Content not found"
      }
    ],
    "summary": {
      "highRisk": 1,
      "mediumRisk": 0,
      "lowRisk": 1,
      "averageProcessingTime": 117
    }
  }
}
```

## Trend Analysis API

### Get Current Trends

Retrieve current trending patterns and emerging threats.

```bash
GET /analysis/trends
```

#### Query Parameters

| Parameter | Type | Description | Default | Example |
|-----------|------|-------------|---------|---------|
| `timeframe` | string | Analysis timeframe | `1h` | `15m`, `1h`, `6h`, `24h`, `7d` |
| `platforms` | string | Comma-separated platforms | `all` | `twitter,youtube` |
| `riskLevel` | string | Minimum risk level | `medium` | `low`, `medium`, `high`, `critical` |
| `category` | string | Specific detection category | - | `hate_speech` |
| `limit` | number | Number of trends to return | 20 | `50` |

#### Example Request

```bash
curl -X GET "https://api.sentinel-ai.com/v1/analysis/trends?timeframe=1h&platforms=twitter,youtube&riskLevel=high&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "timeframe": {
      "duration": "1h",
      "start": "2025-07-25T09:30:00Z",
      "end": "2025-07-25T10:30:00Z"
    },
    "summary": {
      "totalTrends": 15,
      "newTrends": 7,
      "escalatingTrends": 3,
      "highRiskTrends": 2,
      "criticalTrends": 1
    },
    "trends": [
      {
        "id": "trend_789",
        "category": "dangerous_challenge",
        "title": "Viral Dangerous Challenge Spreading",
        "description": "New dangerous challenge involving risky behavior trending across platforms",
        "keywords": ["dangerous challenge", "viral stunt", "risky behavior"],
        "hashtags": ["#dangerouschallenge", "#viralstunt"],
        "platforms": ["tiktok", "instagram", "youtube"],
        "riskLevel": "critical",
        "confidence": 0.94,
        "growth": {
          "velocity": 45.2,
          "acceleration": 12.8,
          "contentCount": 1850,
          "engagementGrowth": 0.35,
          "peakTime": "2025-07-25T10:15:00Z"
        },
        "geographic": {
          "regions": ["North America", "Europe"],
          "hotspots": [
            {
              "location": "United States",
              "intensity": 0.78,
              "contentCount": 892
            },
            {
              "location": "United Kingdom", 
              "intensity": 0.45,
              "contentCount": 234
            }
          ]
        },
        "contentMetrics": {
          "totalContent": 1850,
          "uniqueAuthors": 567,
          "totalEngagement": 125000,
          "averageEngagement": 67.6,
          "viralityScore": 0.89
        },
        "firstDetected": "2025-07-25T09:45:00Z",
        "timeToDetection": "12 minutes",
        "correlations": [
          {
            "platform": "tiktok",
            "similarity": 0.92,
            "timeOffset": 0,
            "leadingIndicator": true
          },
          {
            "platform": "instagram",
            "similarity": 0.78,
            "timeOffset": 15,
            "leadingIndicator": false
          }
        ],
        "samples": [
          {
            "contentId": "content_890",
            "platform": "tiktok",
            "engagement": 15000,
            "riskScore": 0.95
          }
        ],
        "recommendedActions": [
          "immediate_escalation",
          "platform_notification",
          "public_advisory",
          "enhanced_monitoring"
        ]
      }
    ],
    "platformBreakdown": {
      "twitter": {
        "trendCount": 5,
        "highRiskCount": 1,
        "contentVolume": 25000
      },
      "youtube": {
        "trendCount": 3,
        "highRiskCount": 1,
        "contentVolume": 8500
      },
      "tiktok": {
        "trendCount": 4,
        "highRiskCount": 2,
        "contentVolume": 12000
      },
      "instagram": {
        "trendCount": 3,
        "highRiskCount": 1,
        "contentVolume": 9500
      }
    }
  }
}
```

### Trigger Trend Analysis

Manually trigger trend analysis for specific parameters.

```bash
POST /analysis/trends/analyze
```

#### Request Body

```json
{
  "timeframe": "1h",
  "platforms": ["twitter", "youtube"],
  "priority": "high",
  "categories": ["hate_speech", "dangerous_challenge"],
  "options": {
    "includeHistorical": true,
    "crossPlatformCorrelation": true,
    "detailedBreakdown": true
  }
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_123",
    "status": "queued",
    "estimatedCompletionTime": "2025-07-25T10:35:00Z",
    "parameters": {
      "timeframe": "1h",
      "platforms": ["twitter", "youtube"],
      "categories": ["hate_speech", "dangerous_challenge"]
    },
    "queuePosition": 2,
    "progress": {
      "phase": "queued",
      "percentage": 0,
      "currentStep": "waiting_for_processing"
    }
  }
}
```

### Get Trend Summary by Timeframe

Get aggregated trend data for specific time periods.

```bash
GET /analysis/trends/summary/{timeframe}
```

#### Example Request

```bash
curl -X GET "https://api.sentinel-ai.com/v1/analysis/trends/summary/24h" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "timeframe": "24h",
    "period": {
      "start": "2025-07-24T10:30:00Z",
      "end": "2025-07-25T10:30:00Z"
    },
    "overview": {
      "totalTrends": 89,
      "newTrends": 34,
      "resolvedTrends": 12,
      "escalatedTrends": 8,
      "averageDetectionTime": "14 minutes"
    },
    "riskDistribution": {
      "critical": 3,
      "high": 15,
      "medium": 28,
      "low": 43
    },
    "categoryBreakdown": {
      "hate_speech": 23,
      "cyberbullying": 18,
      "dangerous_challenge": 8,
      "misinformation": 15,
      "violence": 12,
      "sexual_content": 7,
      "self_harm": 4,
      "extremism": 2
    },
    "platformActivity": {
      "twitter": {
        "contentAnalyzed": 450000,
        "trendsDetected": 35,
        "flaggedContent": 2250
      },
      "youtube": {
        "contentAnalyzed": 125000,
        "trendsDetected": 18,
        "flaggedContent": 890
      },
      "instagram": {
        "contentAnalyzed": 230000,
        "trendsDetected": 22,
        "flaggedContent": 1450
      },
      "tiktok": {
        "contentAnalyzed": 185000,
        "trendsDetected": 14,
        "flaggedContent": 1120
      }
    },
    "timelineData": [
      {
        "hour": "2025-07-25T09:00:00Z",
        "trendsDetected": 4,
        "contentVolume": 25000,
        "riskScore": 0.45
      }
    ]
  }
}
```

## Alert Management API

### List Alerts

Retrieve system alerts with filtering and pagination.

```bash
GET /alerts
```

#### Query Parameters

| Parameter | Type | Description | Default | Example |
|-----------|------|-------------|---------|---------|
| `severity` | string | Filter by severity | - | `high`, `critical` |
| `status` | string | Filter by status | `open` | `open`, `acknowledged`, `resolved` |
| `category` | string | Filter by category | - | `hate_speech` |
| `platform` | string | Filter by platform | - | `twitter` |
| `assignee` | string | Filter by assignee | - | `user_123` |
| `dateFrom` | string | Start date | - | `2025-07-25T00:00:00Z` |
| `dateTo` | string | End date | - | `2025-07-25T23:59:59Z` |
| `limit` | number | Items per page | 20 | `50` |
| `offset` | number | Items to skip | 0 | `100` |

#### Example Request

```bash
curl -X GET "https://api.sentinel-ai.com/v1/alerts?severity=high&status=open&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert_456",
        "severity": "critical",
        "status": "open",
        "category": "dangerous_challenge",
        "title": "Viral Dangerous Challenge Alert",
        "description": "Rapid spread of harmful challenge across multiple platforms with high engagement",
        "source": "trend_analysis",
        "platforms": ["tiktok", "instagram", "youtube"],
        "metrics": {
          "contentCount": 1850,
          "growthRate": 45.2,
          "estimatedReach": 2500000,
          "engagementRate": 0.35,
          "riskScore": 0.94
        },
        "triggerConditions": {
          "velocityThreshold": 30.0,
          "contentThreshold": 1000,
          "riskThreshold": 0.85
        },
        "affectedRegions": ["North America", "Europe"],
        "relatedContent": [
          {
            "contentId": "content_890",
            "platform": "tiktok",
            "riskScore": 0.95
          }
        ],
        "actions": {
          "recommended": [
            "immediate_escalation",
            "platform_notification",
            "public_advisory"
          ],
          "taken": [],
          "available": [
            "escalate_to_platforms",
            "create_public_advisory",
            "enhance_monitoring",
            "contact_authorities"
          ]
        },
        "timestamps": {
          "created": "2025-07-25T10:15:00Z",
          "lastUpdated": "2025-07-25T10:20:00Z",
          "escalationDeadline": "2025-07-25T11:00:00Z"
        },
        "assignee": null,
        "priority": "urgent",
        "escalationLevel": 1,
        "tags": ["viral", "dangerous", "youth_targeted"]
      }
    ],
    "pagination": {
      "total": 23,
      "page": 1,
      "pages": 3,
      "limit": 10
    },
    "summary": {
      "openAlerts": 23,
      "criticalAlerts": 2,
      "highAlerts": 8,
      "unassignedAlerts": 15
    }
  }
}
```

### Get Specific Alert

Retrieve detailed information about a specific alert.

```bash
GET /alerts/{alertId}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "alert_456",
    "severity": "critical",
    "status": "open",
    "category": "dangerous_challenge",
    "title": "Viral Dangerous Challenge Alert",
    "description": "Rapid spread of harmful challenge across multiple platforms with high engagement",
    "source": "trend_analysis",
    "sourceDetails": {
      "trendId": "trend_789",
      "detectionTime": "2025-07-25T10:15:00Z",
      "triggerRules": ["velocity_spike", "risk_threshold_exceeded"]
    },
    "platforms": ["tiktok", "instagram", "youtube"],
    "metrics": {
      "contentCount": 1850,
      "growthRate": 45.2,
      "estimatedReach": 2500000,
      "engagementRate": 0.35,
      "riskScore": 0.94,
      "uniqueAuthors": 567,
      "averageEngagement": 1351
    },
    "timeline": [
      {
        "timestamp": "2025-07-25T09:45:00Z",
        "event": "trend_detected",
        "details": "Initial trend detection on TikTok"
      },
      {
        "timestamp": "2025-07-25T10:00:00Z",
        "event": "cross_platform_spread",
        "details": "Trend spreading to Instagram and YouTube"
      },
      {
        "timestamp": "2025-07-25T10:15:00Z",
        "event": "alert_triggered",
        "details": "Critical alert triggered due to rapid growth"
      }
    ],
    "affectedRegions": [
      {
        "region": "North America",
        "contentCount": 892,
        "riskScore": 0.78
      },
      {
        "region": "Europe",
        "contentCount": 234,
        "riskScore": 0.45
      }
    ],
    "relatedContent": [
      {
        "contentId": "content_890",
        "platform": "tiktok",
        "riskScore": 0.95,
        "engagement": 15000,
        "isOriginal": true
      }
    ],
    "actions": {
      "recommended": [
        "immediate_escalation",
        "platform_notification",
        "public_advisory"
      ],
      "taken": [],
      "available": [
        "escalate_to_platforms",
        "create_public_advisory", 
        "enhance_monitoring",
        "contact_authorities",
        "media_outreach"
      ]
    },
    "assignee": null,
    "priority": "urgent",
    "escalationLevel": 1,
    "tags": ["viral", "dangerous", "youth_targeted"],
    "comments": [],
    "attachments": []
  }
}
```

### Acknowledge Alert

Acknowledge an alert and assign it for resolution.

```bash
POST /alerts/{alertId}/acknowledge
```

#### Request Body

```json
{
  "acknowledgedBy": "user_123",
  "comment": "Investigating with platform partners. Escalating to safety teams.",
  "action": "escalate_to_platforms",
  "estimatedResolutionTime": "2025-07-25T12:00:00Z",
  "assignTo": "user_456",
  "priority": "urgent"
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "alertId": "alert_456",
    "status": "acknowledged",
    "acknowledgedBy": "user_123",
    "acknowledgedAt": "2025-07-25T10:25:00Z",
    "assignedTo": "user_456",
    "comment": "Investigating with platform partners. Escalating to safety teams.",
    "estimatedResolutionTime": "2025-07-25T12:00:00Z",
    "nextReviewAt": "2025-07-25T11:00:00Z",
    "actionTaken": "escalate_to_platforms",
    "trackingId": "track_789"
  }
}
```

### Update Alert Status

Update the status and details of an alert.

```bash
PUT /alerts/{alertId}/status
```

#### Request Body

```json
{
  "status": "resolved",
  "resolution": "Platform partners removed harmful content. Monitoring continues.",
  "actionsSummary": [
    "Contacted TikTok, Instagram, YouTube safety teams",
    "Content removal coordinated across platforms",
    "Public advisory issued through official channels"
  ],
  "updatedBy": "user_456",
  "resolutionTime": "2025-07-25T11:45:00Z"
}
```

## Dashboard & Metrics API

### System Overview

Get comprehensive system overview and health metrics.

```bash
GET /dashboard/overview
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "systemStatus": {
      "status": "operational",
      "uptime": "99.95%",
      "lastIncident": "2025-07-20T15:30:00Z",
      "nextMaintenance": "2025-08-01T02:00:00Z"
    },
    "processing": {
      "contentIngested24h": 2450000,
      "contentAnalyzed24h": 2448500,
      "analysisBacklog": 1500,
      "averageProcessingTime": 85,
      "throughputPerHour": 102083,
      "errorRate": 0.0012
    },
    "detection": {
      "flaggedContent24h": 12750,
      "highRiskContent": 285,
      "criticalContent": 47,
      "falsePositiveRate": 2.1,
      "accuracyRate": 96.2,
      "humanReviewQueue": 156
    },
    "trends": {
      "activeTrends": 23,
      "newTrends24h": 34,
      "highRiskTrends": 3,
      "criticalTrends": 1,
      "averageDetectionTime": 12,
      "trendResolutionRate": 0.85
    },
    "alerts": {
      "openAlerts": 7,
      "criticalAlerts": 1,
      "acknowledgedAlerts": 15,
      "averageResponseTime": "8m 32s",
      "escalationRate": 0.12
    },
    "platforms": {
      "twitter": {
        "status": "operational",
        "contentIngested": 1200000,
        "apiHealth": 0.99,
        "lastSync": "2025-07-25T10:29:00Z"
      },
      "youtube": {
        "status": "operational", 
        "contentIngested": 450000,
        "apiHealth": 0.97,
        "lastSync": "2025-07-25T10:28:00Z"
      },
      "instagram": {
        "status": "degraded",
        "contentIngested": 380000,
        "apiHealth": 0.85,
        "lastSync": "2025-07-25T10:15:00Z",
        "issues": ["Rate limiting active"]
      },
      "tiktok": {
        "status": "operational",
        "contentIngested": 420000,
        "apiHealth": 0.98,
        "lastSync": "2025-07-25T10:30:00Z"
      }
    },
    "aiModels": {
      "textClassifier": {
        "status": "operational",
        "accuracy": 0.962,
        "latency": 45,
        "throughput": 1200
      },
      "imageClassifier": {
        "status": "operational",
        "accuracy": 0.934,
        "latency": 180,
        "throughput": 400
      },
      "ensembleModel": {
        "status": "operational",
        "accuracy": 0.971,
        "latency": 95,
        "throughput": 800
      }
    }
  }
}
```

### Detailed Metrics

Get comprehensive system metrics and performance data.

```bash
GET /dashboard/metrics
```

#### Query Parameters

| Parameter | Type | Description | Default | Example |
|-----------|------|-------------|---------|---------|
| `timeframe` | string | Metrics timeframe | `24h` | `1h`, `24h`, `7d`, `30d` |
| `granularity` | string | Data granularity | `hour` | `minute`, `hour`, `day` |
| `metrics` | string | Specific metrics | `all` | `processing,detection` |

#### Example Response

```json
{
  "success": true,
  "data": {
    "timeframe": "24h",
    "granularity": "hour",
    "systemMetrics": {
      "processing": {
        "totalContentProcessed": 2450000,
        "averageLatency": 85,
        "peakLatency": 245,
        "throughputTimeseries": [
          {
            "timestamp": "2025-07-25T09:00:00Z",
            "value": 98500
          }
        ],
        "errorRate": 0.0012,
        "queueMetrics": {
          "averageBacklog": 1250,
          "peakBacklog": 4500,
          "averageWaitTime": 12
        }
      },
      "detection": {
        "totalAnalyses": 2448500,
        "flaggedContent": 12750,
        "accuracyMetrics": {
          "precision": 0.962,
          "recall": 0.934,
          "f1Score": 0.948
        },
        "categoryBreakdown": {
          "hate_speech": 3450,
          "cyberbullying": 2890,
          "dangerous_challenge": 1200,
          "misinformation": 2150,
          "violence": 1680,
          "sexual_content": 890,
          "self_harm": 340,
          "extremism": 150
        },
        "falsePositives": {
          "total": 267,
          "rate": 0.021,
          "categoryBreakdown": {
            "hate_speech": 89,
            "cyberbullying": 67
          }
        }
      },
      "platforms": {
        "twitter": {
          "contentIngested": 1200000,
          "flaggedContent": 5680,
          "apiCalls": 45000,
          "apiErrors": 23,
          "uptimePercentage": 99.8
        }
      },
      "resources": {
        "cpuUtilization": [
          {
            "timestamp": "2025-07-25T09:00:00Z",
            "value": 65.2
          }
        ],
        "memoryUsage": [
          {
            "timestamp": "2025-07-25T09:00:00Z", 
            "value": 78.5
          }
        ],
        "diskUsage": 45.2,
        "networkIO": {
          "inbound": 1250000,
          "outbound": 890000
        }
      }
    }
  }
}
```

### Real-time Metrics Stream

Connect to WebSocket for real-time metrics updates.

```javascript
// WebSocket connection
const socket = io('ws://localhost:3000');

// Subscribe to specific metrics
socket.emit('subscribe', {
  metrics: ['processing', 'detection', 'alerts'],
  updateFrequency: 'real-time' // 'real-time', '30s', '1m', '5m'
});

// Receive real-time updates
socket.on('metrics_update', (data) => {
  console.log('Real-time metrics:', data);
  /*
  {
    "type": "metrics_update",
    "timestamp": "2025-07-25T10:30:15Z",
    "data": {
      "processing": {
        "currentQueueSize": 1485,
        "processingRate": 125.5,
        "averageLatency": 82
      },
      "detection": {
        "flaggedLastMinute": 12,
        "currentAccuracy": 0.963
      },
      "alerts": {
        "newAlerts": 1,
        "criticalAlerts": 1
      }
    }
  }
  */
});

// Subscribe to alert notifications
socket.on('new_alert', (alert) => {
  console.log('New alert:', alert);
});

// Subscribe to trend notifications
socket.on('new_trend', (trend) => {
  console.log('New trend detected:', trend);
});
```

### Platform-specific Metrics

Get detailed metrics for a specific platform.

```bash
GET /dashboard/platforms/{platform}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "platform": "twitter",
    "status": "operational",
    "metrics": {
      "contentIngestion": {
        "last24h": 1200000,
        "lastHour": 52000,
        "averagePerHour": 50000,
        "peakHour": 78000
      },
      "detection": {
        "totalAnalyzed": 1198500,
        "flaggedContent": 5680,
        "flagRate": 0.0047,
        "categoryBreakdown": {
          "hate_speech": 1890,
          "cyberbullying": 1450,
          "misinformation": 1120,
          "violence": 780,
          "dangerous_challenge": 340,
          "sexual_content": 100
        }
      },
      "apiHealth": {
        "uptime": 99.8,
        "totalCalls": 45000,
        "successfulCalls": 44977,
        "failedCalls": 23,
        "averageResponseTime": 245,
        "rateLimitHits": 12,
        "lastError": "2025-07-25T08:45:00Z"
      },
      "trends": {
        "activeTrends": 8,
        "newTrends24h": 12,
        "highRiskTrends": 2
      },
      "contentTypes": {
        "text": 1150000,
        "image": 35000,
        "video": 15000
      },
      "engagement": {
        "totalLikes": 15600000,
        "totalShares": 2340000,
        "totalComments": 890000,
        "averageEngagement": 15.7
      }
    },
    "recentActivity": [
      {
        "timestamp": "2025-07-25T10:25:00Z",
        "type": "high_volume_detected",
        "details": "Spike in content volume detected (150% above average)"
      }
    ]
  }
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details if available",
    "timestamp": "2025-07-25T10:30:00Z",
    "requestId": "req_123456",
    "path": "/api/v1/content/invalid_id"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | No authentication token provided |
| `AUTHENTICATION_FAILED` | 401 | Invalid or expired token |
| `AUTHORIZATION_FAILED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Rate Limiting

API rate limits are enforced per user and per endpoint:

```bash
# Rate limit headers in response
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642252800
X-RateLimit-Window: 3600
```

Rate limit exceeded response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 1000 requests per hour.",
    "retryAfter": 3600,
    "timestamp": "2025-07-25T10:30:00Z"
  }
}
```

## SDKs and Integration Examples

### cURL Examples

```bash
# Set base URL and token
export API_BASE="https://api.sentinel-ai.com/v1"
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get recent high-risk content
curl -X GET "$API_BASE/content?riskLevel=high&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Trigger trend analysis
curl -X POST "$API_BASE/analysis/trends/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timeframe": "1h", "priority": "high"}'
```

### JavaScript SDK Example

```javascript
const SentinelAI = require('@sentinel-ai/sdk');

const client = new SentinelAI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.sentinel-ai.com/v1'
});

// Get recent content
const content = await client.content.list({
  platform: 'twitter',
  riskLevel: 'high',
  limit: 50
});

// Analyze specific content
const analysis = await client.content.analyze('content_123', {
  forceReanalysis: true,
  priority: 'high'
});

// Get real-time trends
const trends = await client.trends.getCurrent({
  timeframe: '1h',
  platforms: ['twitter', 'youtube']
});

// Subscribe to real-time updates
client.subscribe('alerts', (alert) => {
  console.log('New alert:', alert);
});
```

### Python SDK Example

```python
from sentinel_ai import SentinelAI

client = SentinelAI(
    api_key='your-api-key',
    base_url='https://api.sentinel-ai.com/v1'
)

# Get content with filtering
content = client.content.list(
    platform='twitter',
    risk_level='high',
    limit=50
)

# Batch analyze content
batch = client.content.batch_analyze(
    content_ids=['content_123', 'content_124'],
    priority='medium'
)

# Get system metrics
metrics = client.dashboard.get_metrics(
    timeframe='24h',
    granularity='hour'
)

# Create alert webhook
@client.webhook('alerts')
def handle_alert(alert):
    print(f"New alert: {alert['title']}")
    if alert['severity'] == 'critical':
        # Handle critical alert
        notify_team(alert)
```

This API documentation provides comprehensive coverage of all Sentinel AI endpoints with detailed examples, request/response schemas, and integration guidance for developers.