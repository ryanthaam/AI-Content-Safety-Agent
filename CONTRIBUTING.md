# Contributing to Sentinel AI Content Safety Agent

Thank you for your interest in contributing to Sentinel AI! This guide will help you get started with contributing to our content safety platform.

## 🌟 Ways to Contribute

### Code Contributions
- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 🔧 Performance optimizations
- 📝 Documentation improvements
- 🧪 Test coverage improvements

### Non-Code Contributions
- 📖 Documentation updates
- 🎨 UI/UX improvements
- 🌍 Internationalization
- 🔍 Security audits
- 💡 Feature suggestions and ideas

### Research Contributions
- 🤖 AI/ML model improvements
- 📊 Detection accuracy research
- 🔍 New threat pattern identification
- 📈 Performance benchmarking

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **MongoDB**: 5.7 or higher
- **Redis**: 6.0 or higher
- **Git**: Latest version
- **Code Editor**: VS Code (recommended)

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/your-username/AI-Content-Safety-Agent.git
   cd AI-Content-Safety-Agent
   
   # Add upstream remote
   git remote add upstream https://github.com/your-org/AI-Content-Safety-Agent.git
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env.development
   
   # Edit with your development configuration
   nano .env.development
   ```

4. **Start Infrastructure**
   ```bash
   # Using Docker (recommended)
   docker-compose -f docker/docker-compose.dev.yml up -d
   
   # Or install locally
   # MongoDB: brew install mongodb-community (macOS)
   # Redis: brew install redis (macOS)
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Verify Setup**
   ```bash
   curl http://localhost:3000/health
   ```

## 🔄 Development Workflow

### 1. Branch Strategy

We use **Git Flow** branching model:

```
main/master     Production-ready code
├── develop     Integration branch for features
├── feature/*   Feature development branches
├── hotfix/*    Critical bug fixes
└── release/*   Release preparation branches
```

### 2. Creating a Feature Branch

```bash
# Sync with upstream
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/your-feature-name

# Examples:
git checkout -b feature/add-discord-adapter
git checkout -b feature/improve-text-classification
git checkout -b feature/dashboard-real-time-updates
```

### 3. Making Changes

#### Code Style Guidelines

We follow these coding standards:

```typescript
// File naming: camelCase for files, PascalCase for classes
// src/services/contentDetectionService.ts
// src/models/ContentDetector.ts

// Function naming: descriptive and action-oriented
async function analyzeContentForHarmfulPatterns(content: Content): Promise<DetectionResult> {
  // Implementation
}

// Interface naming: descriptive with 'I' prefix for interfaces
interface IContentAnalyzer {
  analyze(content: Content): Promise<DetectionResult>;
}

// Constant naming: UPPER_SNAKE_CASE
const MAX_CONTENT_LENGTH = 10000;
const DEFAULT_DETECTION_THRESHOLD = 0.85;

// Error handling: always use try-catch for async operations
try {
  const result = await this.detectHarmfulContent(content);
  return result;
} catch (error) {
  logger.error('Content detection failed:', error);
  throw new ContentDetectionError('Failed to analyze content', error);
}
```

#### TypeScript Guidelines

```typescript
// Always use explicit types
interface ContentDetectionRequest {
  contentId: string;
  priority: 'low' | 'medium' | 'high';
  models: ('text' | 'image' | 'video' | 'audio')[];
  options?: {
    includeContext?: boolean;
    detailedEvidence?: boolean;
  };
}

// Use generics for reusable components
class APIResponse<T> {
  constructor(
    public success: boolean,
    public data?: T,
    public error?: string
  ) {}
}

// Prefer interfaces over types for object shapes
interface ServiceConfig {
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

// Use enums for fixed sets of values
enum DetectionCategory {
  HATE_SPEECH = 'hate_speech',
  CYBERBULLYING = 'cyberbullying',
  SELF_HARM = 'self_harm',
  VIOLENCE = 'violence'
}
```

#### Documentation Standards

```typescript
/**
 * Analyzes content for harmful patterns using multiple AI models
 * 
 * @param content - The content to analyze
 * @param options - Analysis configuration options
 * @returns Promise resolving to detection results with confidence scores
 * 
 * @example
 * ```typescript
 * const result = await analyzer.analyzeContent(content, {
 *   models: ['text', 'image'],
 *   includeEvidence: true
 * });
 * 
 * if (result.overallRisk === 'high') {
 *   await responseEngine.flagContent(content.id);
 * }
 * ```
 * 
 * @throws {ContentDetectionError} When analysis fails
 * @throws {ValidationError} When content format is invalid
 */
async analyzeContent(
  content: Content,
  options: AnalysisOptions = {}
): Promise<DetectionResult> {
  // Implementation
}
```

### 4. Testing Requirements

#### Test Coverage Expectations

- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user workflows

#### Writing Tests

```typescript
// Unit test example
// tests/unit/services/ContentDetectionService.test.ts
import { ContentDetectionService } from '@/services/ContentDetectionService';
import { mockContent, mockDetectionResult } from '../fixtures/content';

describe('ContentDetectionService', () => {
  let service: ContentDetectionService;
  
  beforeEach(() => {
    service = new ContentDetectionService();
  });

  describe('analyzeContent', () => {
    it('should detect harmful content correctly', async () => {
      // Arrange
      const content = mockContent.harmfulText;
      
      // Act
      const result = await service.analyzeContent(content);
      
      // Assert
      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.overallRisk).toBe('high');
      expect(result.categories.hate_speech.score).toBeGreaterThan(0.8);
    });

    it('should handle analysis errors gracefully', async () => {
      // Arrange
      const invalidContent = mockContent.invalid;
      
      // Act & Assert
      await expect(service.analyzeContent(invalidContent))
        .rejects.toThrow('Invalid content format');
    });
  });
});
```

```typescript
// Integration test example
// tests/integration/api/content.test.ts
import request from 'supertest';
import { app } from '@/index';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';

describe('Content API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/content', () => {
    it('should return content list with proper authentication', async () => {
      const token = await getAuthToken();
      
      const response = await request(app)
        .get('/api/v1/content')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBeInstanceOf(Array);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/content')
        .expect(401);
    });
  });
});
```

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- ContentDetectionService.test.ts
```

### 5. Code Quality Checks

#### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Type checking
npm run typecheck

# Format code (if Prettier is configured)
npm run format
```

#### Pre-commit Hooks

We use Husky for pre-commit hooks:

```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run typecheck
npm test
```

### 6. Commit Guidelines

#### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(detection): add Discord platform adapter` |
| `fix` | Bug fix | `fix(api): resolve memory leak in content analysis` |
| `docs` | Documentation | `docs(api): update authentication examples` |
| `style` | Code style changes | `style(components): fix ESLint warnings` |
| `refactor` | Code refactoring | `refactor(services): extract common detection logic` |
| `perf` | Performance improvements | `perf(detection): optimize image classification speed` |
| `test` | Test additions/modifications | `test(integration): add trend analysis API tests` |
| `chore` | Maintenance tasks | `chore(deps): update OpenAI SDK to v4.0` |

#### Commit Examples

```bash
# Good commit messages
git commit -m "feat(detection): implement video frame analysis for harmful content"
git commit -m "fix(api): handle rate limit errors from Twitter API gracefully"
git commit -m "docs(deployment): add Kubernetes configuration examples"
git commit -m "perf(database): optimize content query with compound indexes"

# Bad commit messages
git commit -m "fix stuff"
git commit -m "update code"
git commit -m "working version"
```

## 🔍 Code Review Process

### 1. Creating a Pull Request

```bash
# Push your feature branch
git push origin feature/your-feature-name

# Create PR on GitHub with:
# - Clear title and description
# - Link to related issues
# - Screenshots/demos if applicable
# - Checklist completion
```

#### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Fixes #(issue number)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Screenshots/Demos
(If applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### 2. Review Criteria

#### Code Quality
- [ ] Follows established patterns and conventions
- [ ] Proper error handling and logging
- [ ] No hardcoded values or secrets
- [ ] Efficient algorithms and data structures
- [ ] Memory and performance considerations

#### Security
- [ ] Input validation and sanitization
- [ ] No injection vulnerabilities
- [ ] Proper authentication/authorization
- [ ] Sensitive data protection
- [ ] Rate limiting where appropriate

#### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful and thorough
- [ ] Edge cases considered
- [ ] Integration points tested
- [ ] Performance tests if applicable

#### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic is commented
- [ ] API changes documented
- [ ] README updated if needed
- [ ] Changelog entry added

### 3. Review Process

1. **Automated Checks**
   - CI/CD pipeline runs
   - Tests pass
   - Code quality gates pass
   - Security scans complete

2. **Peer Review**
   - At least 2 reviewers required
   - Domain expert review for complex changes
   - Security review for sensitive changes

3. **Approval and Merge**
   - All feedback addressed
   - CI/CD passes
   - Squash merge to develop branch

## 🏗️ Architecture Guidelines

### 1. Service Architecture

```typescript
// Service structure example
export class ContentDetectionService {
  private textClassifier: TextClassifier;
  private imageClassifier: ImageClassifier;
  private ensembleClassifier: EnsembleClassifier;

  constructor(
    textClassifier: TextClassifier,
    imageClassifier: ImageClassifier,
    ensembleClassifier: EnsembleClassifier
  ) {
    this.textClassifier = textClassifier;
    this.imageClassifier = imageClassifier;
    this.ensembleClassifier = ensembleClassifier;
  }

  async analyzeContent(content: Content): Promise<DetectionResult> {
    // Single responsibility: content analysis coordination
    const textResult = await this.analyzeText(content.text);
    const imageResult = await this.analyzeImages(content.images);
    
    return this.ensembleClassifier.combine([textResult, imageResult]);
  }

  private async analyzeText(text: string): Promise<ClassificationResult> {
    // Delegate to specialized classifier
    return this.textClassifier.classify(text);
  }
}
```

### 2. Error Handling Strategy

```typescript
// Custom error classes
export class ContentDetectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ContentDetectionError';
  }
}

// Service layer error handling
export class ContentDetectionService {
  async analyzeContent(content: Content): Promise<DetectionResult> {
    try {
      this.validateContent(content);
      return await this.performAnalysis(content);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ContentDetectionError(
          'Invalid content format',
          'VALIDATION_FAILED',
          error
        );
      }
      
      logger.error('Content analysis failed:', {
        contentId: content.id,
        error: error.message,
        stack: error.stack
      });
      
      throw new ContentDetectionError(
        'Analysis failed due to internal error',
        'ANALYSIS_FAILED',
        error
      );
    }
  }
}
```

### 3. Database Patterns

```typescript
// Repository pattern
export interface IContentRepository {
  findById(id: string): Promise<Content | null>;
  findByPlatform(platform: string, options: FindOptions): Promise<Content[]>;
  create(content: Content): Promise<Content>;
  update(id: string, updates: Partial<Content>): Promise<Content>;
  delete(id: string): Promise<void>;
}

export class MongoContentRepository implements IContentRepository {
  constructor(private collection: Collection<Content>) {}

  async findById(id: string): Promise<Content | null> {
    try {
      return await this.collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      logger.error('Failed to find content by ID:', { id, error });
      throw new DatabaseError('Content lookup failed', error);
    }
  }
}
```

## 🧪 Testing Guidelines

### 1. Test Structure

```
tests/
├── unit/                 # Isolated unit tests
│   ├── services/        # Service layer tests
│   ├── models/          # Model and utility tests
│   └── utils/           # Utility function tests
├── integration/         # Integration tests
│   ├── api/            # API endpoint tests
│   ├── database/       # Database integration tests
│   └── external/       # External service integration
├── e2e/                # End-to-end tests
│   ├── workflows/      # Complete user workflows
│   └── scenarios/      # Business scenario tests
├── load/               # Performance and load tests
├── security/           # Security-focused tests
└── fixtures/           # Test data and mocks
    ├── content/        # Sample content data
    ├── responses/      # Mock API responses
    └── configs/        # Test configurations
```

### 2. Test Utilities

```typescript
// tests/helpers/testDatabase.ts
export async function setupTestDatabase(): Promise<void> {
  await connectDatabase(process.env.TEST_MONGODB_URI);
  await seedTestData();
}

export async function teardownTestDatabase(): Promise<void> {
  await clearTestData();
  await disconnectDatabase();
}

export async function createTestContent(overrides: Partial<Content> = {}): Promise<Content> {
  const defaultContent: Content = {
    id: 'test-content-' + Date.now(),
    platform: 'twitter',
    contentType: 'text',
    originalId: 'tweet-123',
    author: {
      id: 'user-123',
      username: 'testuser',
      followerCount: 100
    },
    content: {
      text: 'This is test content',
      language: 'en'
    },
    engagement: {
      likes: 10,
      shares: 2,
      comments: 5
    },
    timestamps: {
      published: new Date(),
      ingested: new Date()
    },
    status: 'pending',
    ...overrides
  };

  return await contentRepository.create(defaultContent);
}
```

### 3. Mock Strategies

```typescript
// tests/mocks/openai.ts
export const mockOpenAI = {
  moderations: {
    create: jest.fn().mockResolvedValue({
      results: [{
        flagged: true,
        categories: {
          hate: true,
          harassment: false,
          violence: false
        },
        category_scores: {
          hate: 0.92,
          harassment: 0.15,
          violence: 0.08
        }
      }]
    })
  }
};

// Usage in tests
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI)
}));
```

## 🔒 Security Guidelines

### 1. Input Validation

```typescript
// Always validate and sanitize inputs
import Joi from 'joi';

const contentAnalysisSchema = Joi.object({
  contentId: Joi.string().uuid().required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  models: Joi.array().items(
    Joi.string().valid('text', 'image', 'video', 'audio')
  ).min(1).required(),
  options: Joi.object({
    includeContext: Joi.boolean().default(false),
    detailedEvidence: Joi.boolean().default(false)
  }).optional()
});

export async function validateContentAnalysisRequest(
  request: unknown
): Promise<ContentAnalysisRequest> {
  const { error, value } = contentAnalysisSchema.validate(request);
  
  if (error) {
    throw new ValidationError('Invalid request format', error.details);
  }
  
  return value;
}
```

### 2. Authentication and Authorization

```typescript
// Middleware for authentication
export function requireAuth(permissions: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req.headers.authorization);
      const user = await verifyToken(token);
      
      if (permissions.length > 0) {
        const hasPermission = permissions.some(permission => 
          user.permissions.includes(permission)
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  };
}
```

### 3. Data Protection

```typescript
// Never log sensitive information
logger.info('User authenticated', {
  userId: user.id,
  username: user.username,
  // DON'T LOG: password, tokens, API keys
});

// Sanitize data before storing
export function sanitizeContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}

// Use environment variables for secrets
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.MONGODB_URI
};

// Validate required environment variables
Object.entries(config).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Required environment variable missing: ${key}`);
  }
});
```

## 📋 Issue Reporting

### Bug Reports

When reporting bugs, please include:

```markdown
## Bug Description
A clear description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., macOS 12.0]
- Node.js version: [e.g., 18.0.0]
- Browser: [e.g., Chrome 96.0]
- Version: [e.g., 2.0.0]

## Additional Context
Add any other context about the problem here.

## Logs
```
Relevant log output
```

## Screenshots
If applicable, add screenshots to help explain your problem.
```

### Feature Requests

```markdown
## Feature Description
A clear description of the feature you'd like to see.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Describe your proposed solution.

## Alternative Solutions
Describe any alternative solutions you've considered.

## Use Cases
Describe specific use cases for this feature.

## Additional Context
Add any other context or screenshots about the feature request.
```

## 📈 Performance Guidelines

### 1. Database Optimization

```typescript
// Use proper indexing
await db.collection('content').createIndex({
  'platform': 1,
  'timestamps.ingested': -1
});

// Optimize queries
const content = await db.collection('content').find({
  platform: 'twitter',
  'detectionResult.overallRisk': 'high'
}).limit(100).sort({ 'timestamps.published': -1 }).toArray();

// Use aggregation for complex queries
const trendData = await db.collection('content').aggregate([
  { $match: { platform: 'twitter' } },
  { $group: { 
    _id: '$detectionResult.overallRisk', 
    count: { $sum: 1 } 
  }},
  { $sort: { count: -1 } }
]).toArray();
```

### 2. Caching Strategy

```typescript
// Use Redis for caching
export class CachedContentService {
  constructor(
    private contentService: ContentService,
    private cache: Redis
  ) {}

  async getContent(id: string): Promise<Content> {
    const cacheKey = `content:${id}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fallback to database
    const content = await this.contentService.getById(id);
    
    // Cache for 1 hour
    await this.cache.setex(cacheKey, 3600, JSON.stringify(content));
    
    return content;
  }
}
```

### 3. Memory Management

```typescript
// Use streams for large datasets
import { pipeline } from 'stream/promises';

export async function processLargeDataset(inputStream: Readable): Promise<void> {
  await pipeline(
    inputStream,
    new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Process each chunk
        const processed = this.processChunk(chunk);
        callback(null, processed);
      }
    }),
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        // Write processed data
        this.writeChunk(chunk);
        callback();
      }
    })
  );
}
```

## 🚀 Release Process

### 1. Version Management

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### 2. Release Workflow

```bash
# 1. Create release branch
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# 2. Update version and changelog
npm version 1.2.0
# Update CHANGELOG.md

# 3. Test release candidate
npm run test:all
npm run build
npm run test:e2e

# 4. Merge to main
git checkout main
git merge release/1.2.0
git tag v1.2.0

# 5. Deploy to production
git push origin main --tags

# 6. Merge back to develop
git checkout develop
git merge main
```

### 3. Changelog Format

```markdown
# Changelog

## [2.0.0] - 2025-07-25

### Added
- Discord platform adapter for content ingestion
- Real-time trend correlation across platforms
- Enhanced video analysis with frame-by-frame detection

### Changed
- Improved ensemble classifier accuracy by 3%
- Updated OpenAI API integration to v4.0
- Optimized database queries for better performance

### Fixed
- Memory leak in content processing pipeline
- Race condition in trend analysis service
- Authentication token refresh issues

### Security
- Updated dependencies to address security vulnerabilities
- Enhanced input validation for API endpoints

### Deprecated
- Legacy Twitter API v1.1 support (use v2.0)

### Removed
- Unused sentiment analysis models
```

## 🤝 Community

### Communication Channels

- **GitHub Discussions**: General questions and discussions
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time chat with the community
- **Email**: security@sentinel-ai.com for security issues

### Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

### Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor highlights

## 📚 Additional Resources

### Learning Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MongoDB University](https://university.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)

### Tools and Extensions
- **VS Code Extensions**:
  - TypeScript Hero
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API testing)

### Project-Specific Resources
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Technical README](TECHNICAL_README.md)

---

Thank you for contributing to Sentinel AI! Together, we're building a safer internet. 🛡️

For questions about contributing, please reach out to the maintainers or open a GitHub Discussion.