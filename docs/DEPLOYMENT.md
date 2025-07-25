# Sentinel AI - Deployment Guide

## Overview

This guide covers deployment options for the Sentinel AI Content Safety Agent, from local development to production-ready cloud deployments. The system is designed to be scalable, secure, and maintainable across different environments.

## Quick Start

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **MongoDB**: 5.7 or higher
- **Redis**: 6.0 or higher
- **Docker**: 20.10+ (optional but recommended)
- **Git**: Latest version

### Minimum System Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| CPU | 2 cores | 8+ cores |
| RAM | 4 GB | 16+ GB |
| Storage | 20 GB | 500+ GB SSD |
| Network | 10 Mbps | 1 Gbps |

### Recommended Production Requirements

| Component | Recommended |
|-----------|-------------|
| CPU | 16+ cores (Intel Xeon or AMD EPYC) |
| RAM | 32+ GB |
| Storage | 1+ TB NVMe SSD |
| Network | 10 Gbps with redundancy |
| Load Balancer | Yes |
| CDN | Yes |

## Local Development Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/AI-Content-Safety-Agent.git
cd AI-Content-Safety-Agent

# Install dependencies
npm install

# Install global tools (optional)
npm install -g nodemon typescript ts-node
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

#### Development Environment Variables

```bash
# Development Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database URLs
MONGODB_URI=mongodb://localhost:27017/sentinel-ai-dev
REDIS_URL=redis://localhost:6379/0

# Development API Keys (use test keys)
OPENAI_API_KEY=sk-test-your-openai-key
HUGGINGFACE_API_KEY=hf_test-your-huggingface-token

# Platform API Keys (development/sandbox)
TWITTER_API_KEY=dev-your-twitter-key
YOUTUBE_API_KEY=dev-your-youtube-key

# Security (development)
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRY=24h

# Detection Thresholds (more lenient for testing)
HARMFUL_CONTENT_THRESHOLD=0.7
TREND_DETECTION_THRESHOLD=0.6
AUTO_ACTION_THRESHOLD=0.9

# Development Features
DEBUG_MODE=true
ENABLE_TEST_ENDPOINTS=true
MOCK_EXTERNAL_APIS=false
```

### 3. Infrastructure Setup

#### Option A: Local Installation

```bash
# Install MongoDB
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Install Redis
# macOS with Homebrew
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### Option B: Docker Compose (Recommended)

```bash
# Start infrastructure services
docker-compose -f docker/docker-compose.dev.yml up -d

# Check services
docker-compose -f docker/docker-compose.dev.yml ps
```

**docker/docker-compose.dev.yml:**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.7
    container_name: sentinel-mongodb-dev
    ports:
      - "27017:27017"
    volumes:
      - mongodb_dev_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=sentinel-ai-dev
    networks:
      - sentinel-dev

  redis:
    image: redis:7-alpine
    container_name: sentinel-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    command: redis-server --appendonly yes
    networks:
      - sentinel-dev

  mongodb-express:
    image: mongo-express
    container_name: sentinel-mongo-express-dev
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_URL=mongodb://mongodb:27017/sentinel-ai-dev
    depends_on:
      - mongodb
    networks:
      - sentinel-dev

  redis-commander:
    image: rediscommander/redis-commander
    container_name: sentinel-redis-commander-dev
    ports:
      - "8082:8081"
    environment:
      - REDIS_HOSTS=local:redis:6379
    depends_on:
      - redis
    networks:
      - sentinel-dev

volumes:
  mongodb_dev_data:
  redis_dev_data:

networks:
  sentinel-dev:
```

### 4. Application Startup

```bash
# Build TypeScript
npm run build

# Start development server with hot reload
npm run dev

# Or start built application
npm start
```

### 5. Development Tools

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type checking
npm run typecheck

# Database seed (if available)
npm run seed
```

### 6. Verify Installation

```bash
# Check application health
curl http://localhost:3000/health

# Check API endpoints
curl http://localhost:3000/api/v1/dashboard/overview

# Access development tools
open http://localhost:8081  # MongoDB Express
open http://localhost:8082  # Redis Commander
```

## Docker Deployment

### Single Container Deployment

#### 1. Build Application Image

```bash
# Build production image
docker build -f docker/Dockerfile -t sentinel-ai:latest .

# Build with build args
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_VERSION=$(git rev-parse --short HEAD) \
  -f docker/Dockerfile \
  -t sentinel-ai:latest .
```

#### 2. Production Dockerfile

```dockerfile
# docker/Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source code
RUN rm -rf src tests *.md docker scripts

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app .

# Create necessary directories
RUN mkdir -p logs tmp uploads && \
    chown -R nodejs:nodejs logs tmp uploads

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
```

#### 3. Run Container

```bash
# Run with environment file
docker run -d \
  --name sentinel-ai \
  --env-file .env.production \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  sentinel-ai:latest

# Run with inline environment variables
docker run -d \
  --name sentinel-ai \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://your-mongodb:27017/sentinel-ai \
  -e REDIS_URL=redis://your-redis:6379 \
  -p 3000:3000 \
  sentinel-ai:latest
```

### Multi-Container Deployment

#### 1. Production Docker Compose

**docker/docker-compose.prod.yml:**

```yaml
version: '3.8'

services:
  sentinel-ai:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: sentinel-ai-app
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/sentinel-ai
      - REDIS_URL=redis://redis:6379
    env_file:
      - ../.env.production
    depends_on:
      - mongodb
      - redis
    volumes:
      - ../logs:/app/logs
      - uploads:/app/uploads
    networks:
      - sentinel-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:5.7
    container_name: sentinel-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=sentinel-ai
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USERNAME:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD:-changeme}
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
      - ./mongodb.conf:/etc/mongod.conf:ro
    networks:
      - sentinel-network
    command: --config /etc/mongod.conf

  redis:
    image: redis:7-alpine
    container_name: sentinel-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    networks:
      - sentinel-network
    command: redis-server /usr/local/etc/redis/redis.conf

  nginx:
    image: nginx:alpine
    container_name: sentinel-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - sentinel-ai
    networks:
      - sentinel-network

  prometheus:
    image: prom/prometheus
    container_name: sentinel-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - sentinel-network

  grafana:
    image: grafana/grafana
    container_name: sentinel-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana:/etc/grafana/provisioning
    networks:
      - sentinel-network

volumes:
  mongodb_data:
  redis_data:
  uploads:
  nginx_logs:
  prometheus_data:
  grafana_data:

networks:
  sentinel-network:
    driver: bridge
```

#### 2. Configuration Files

**docker/mongodb.conf:**

```yaml
# MongoDB Configuration
net:
  port: 27017
  bindIp: 0.0.0.0
  maxIncomingConnections: 1000

storage:
  dbPath: /data/db
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy

replication:
  replSetName: "rs0"

security:
  authorization: enabled

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp

setParameter:
  logLevel: 1
```

**docker/redis.conf:**

```conf
# Redis Configuration
bind 0.0.0.0
port 6379
protected-mode yes
requirepass your-redis-password

# Memory management
maxmemory 4gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

appendonly yes
appendfsync everysec

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG "CONFIG_9a8b7c6d"

# Logging
loglevel notice
logfile ""

# Performance
timeout 300
tcp-keepalive 300
tcp-backlog 511
```

**docker/nginx.conf:**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream sentinel_backend {
        server sentinel-ai:3000;
        keepalive 32;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/certificate.crt;
        ssl_certificate_key /etc/nginx/ssl/private.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://sentinel_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Authentication endpoints (stricter rate limiting)
        location /api/v1/auth/ {
            limit_req zone=auth burst=5 nodelay;
            
            proxy_pass http://sentinel_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://sentinel_backend;
            access_log off;
        }

        # WebSocket support
        location /socket.io/ {
            proxy_pass http://sentinel_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 3. Deploy with Docker Compose

```bash
# Deploy production stack
docker-compose -f docker/docker-compose.prod.yml up -d

# View logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# Scale application
docker-compose -f docker/docker-compose.prod.yml up -d --scale sentinel-ai=3

# Update application
docker-compose -f docker/docker-compose.prod.yml pull
docker-compose -f docker/docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker/docker-compose.prod.yml down
```

## Kubernetes Deployment

### 1. Namespace and Configuration

**k8s/namespace.yaml:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sentinel-ai
  labels:
    name: sentinel-ai
```

**k8s/configmap.yaml:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sentinel-ai-config
  namespace: sentinel-ai
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  MONGODB_URI: "mongodb://mongodb-service:27017/sentinel-ai"
  REDIS_URL: "redis://redis-service:6379"
  HARMFUL_CONTENT_THRESHOLD: "0.85"
  TREND_DETECTION_THRESHOLD: "0.75"
  AUTO_ACTION_THRESHOLD: "0.95"
```

**k8s/secrets.yaml:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sentinel-ai-secrets
  namespace: sentinel-ai
type: Opaque
stringData:
  OPENAI_API_KEY: "your-openai-api-key"
  HUGGINGFACE_API_KEY: "your-huggingface-api-key"
  TWITTER_API_KEY: "your-twitter-api-key"
  YOUTUBE_API_KEY: "your-youtube-api-key"
  JWT_SECRET: "your-jwt-secret"
  MONGO_ROOT_PASSWORD: "your-mongodb-password"
  REDIS_PASSWORD: "your-redis-password"
```

### 2. Persistent Storage

**k8s/storage.yaml:**

```yaml
# MongoDB PersistentVolume
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongodb-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  hostPath:
    path: /var/lib/mongodb

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: sentinel-ai
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd

---
# Redis PersistentVolume
apiVersion: v1
kind: PersistentVolume
metadata:
  name: redis-pv
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  hostPath:
    path: /var/lib/redis

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: sentinel-ai
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
```

### 3. Database Deployments

**k8s/mongodb.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: sentinel-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:5.7
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_DATABASE
          value: "sentinel-ai"
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sentinel-ai-secrets
              key: MONGO_ROOT_PASSWORD
        volumeMounts:
        - name: mongodb-storage
          mountPath: /data/db
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - mongo
            - --eval
            - "db.adminCommand('ismaster')"
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - mongo
            - --eval
            - "db.adminCommand('ismaster')"
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: mongodb-storage
        persistentVolumeClaim:
          claimName: mongodb-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
  namespace: sentinel-ai
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
  type: ClusterIP
```

**k8s/redis.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: sentinel-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        - --appendonly
        - "yes"
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sentinel-ai-secrets
              key: REDIS_PASSWORD
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: sentinel-ai
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

### 4. Application Deployment

**k8s/application.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentinel-ai
  namespace: sentinel-ai
  labels:
    app: sentinel-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sentinel-ai
  template:
    metadata:
      labels:
        app: sentinel-ai
    spec:
      containers:
      - name: sentinel-ai
        image: sentinel-ai:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: sentinel-ai-config
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: sentinel-ai-secrets
              key: OPENAI_API_KEY
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: sentinel-ai-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      imagePullSecrets:
      - name: regcred

---
apiVersion: v1
kind: Service
metadata:
  name: sentinel-ai-service
  namespace: sentinel-ai
spec:
  selector:
    app: sentinel-ai
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sentinel-ai-ingress
  namespace: sentinel-ai
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.sentinel-ai.com
    secretName: sentinel-ai-tls
  rules:
  - host: api.sentinel-ai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sentinel-ai-service
            port:
              number: 80
```

### 5. Horizontal Pod Autoscaler

**k8s/hpa.yaml:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sentinel-ai-hpa
  namespace: sentinel-ai
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sentinel-ai
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
```

### 6. Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configurations and secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Create storage
kubectl apply -f k8s/storage.yaml

# Deploy databases
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=mongodb -n sentinel-ai --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n sentinel-ai --timeout=300s

# Deploy application
kubectl apply -f k8s/application.yaml

# Create HPA
kubectl apply -f k8s/hpa.yaml

# Check deployment status
kubectl get pods -n sentinel-ai
kubectl get services -n sentinel-ai
kubectl get ingress -n sentinel-ai
```

## Cloud Provider Deployments

### AWS ECS with Fargate

**ecs/task-definition.json:**

```json
{
  "family": "sentinel-ai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/sentinelAiTaskRole",
  "containerDefinitions": [
    {
      "name": "sentinel-ai",
      "image": "your-account.dkr.ecr.region.amazonaws.com/sentinel-ai:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MONGODB_URI",
          "value": "mongodb://your-documentdb-cluster.cluster-abc123.region.docdb.amazonaws.com:27017/sentinel-ai"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://your-elasticache-cluster.cache.amazonaws.com:6379"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:sentinel-ai/openai-key"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:sentinel-ai/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sentinel-ai",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**ecs/service.json:**

```json
{
  "serviceName": "sentinel-ai-service",
  "cluster": "sentinel-ai-cluster",
  "taskDefinition": "sentinel-ai",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": [
        "subnet-12345678",
        "subnet-87654321"
      ],
      "securityGroups": [
        "sg-12345678"
      ],
      "assignPublicIp": "DISABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/sentinel-ai/abc123",
      "containerName": "sentinel-ai",
      "containerPort": 3000
    }
  ],
  "serviceRegistries": [
    {
      "registryArn": "arn:aws:servicediscovery:region:account:service/srv-abc123"
    }
  ]
}
```

### Google Cloud Run

**cloudbuild.yaml:**

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/sentinel-ai:$COMMIT_SHA', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/sentinel-ai:$COMMIT_SHA']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
    - 'run'
    - 'deploy'
    - 'sentinel-ai'
    - '--image'
    - 'gcr.io/$PROJECT_ID/sentinel-ai:$COMMIT_SHA'
    - '--region'
    - 'us-central1'
    - '--platform'
    - 'managed'
    - '--allow-unauthenticated'
    - '--set-env-vars'
    - 'NODE_ENV=production'
    - '--memory'
    - '4Gi'
    - '--cpu'
    - '2'
    - '--max-instances'
    - '10'
    - '--concurrency'
    - '80'

images:
- gcr.io/$PROJECT_ID/sentinel-ai:$COMMIT_SHA
```

### Azure Container Instances

**azure/deployment.json:**

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "2.0.0.0",
  "parameters": {
    "containerGroupName": {
      "type": "string",
      "defaultValue": "sentinel-ai-group"
    }
  },
  "resources": [
    {
      "type": "Microsoft.ContainerInstance/containerGroups",
      "apiVersion": "2019-12-01",
      "name": "[parameters('containerGroupName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "containers": [
          {
            "name": "sentinel-ai",
            "properties": {
              "image": "your-registry.azurecr.io/sentinel-ai:latest",
              "ports": [
                {
                  "port": 3000,
                  "protocol": "TCP"
                }
              ],
              "environmentVariables": [
                {
                  "name": "NODE_ENV",
                  "value": "production"
                }
              ],
              "resources": {
                "requests": {
                  "cpu": 2,
                  "memoryInGB": 4
                }
              }
            }
          }
        ],
        "osType": "Linux",
        "restartPolicy": "Always",
        "ipAddress": {
          "type": "Public",
          "ports": [
            {
              "port": 3000,
              "protocol": "TCP"
            }
          ]
        }
      }
    }
  ]
}
```

## Monitoring and Observability

### 1. Application Monitoring

**monitoring/prometheus.yml:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'sentinel-ai'
    static_configs:
      - targets: ['sentinel-ai:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb:27017']
    metrics_path: '/metrics'

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    metrics_path: '/metrics'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

**monitoring/alert_rules.yml:**

```yaml
groups:
  - name: sentinel-ai-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"

      - alert: DatabaseConnectionFailed
        expr: up{job="mongodb"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "MongoDB is not responding"
```

### 2. Logging Stack

**logging/fluentd.conf:**

```conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<filter sentinel-ai.**>
  @type parser
  format json
  key_name log
  reserve_data true
</filter>

<match sentinel-ai.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name sentinel-ai
  type_name _doc
  include_tag_key true
  tag_key @log_name
  flush_interval 1s
</match>
```

### 3. Health Checks and Readiness

```bash
#!/bin/bash
# scripts/health-check.sh

set -e

echo "🔍 Running Sentinel AI Health Check"
echo "=================================="

# Check application health
echo "Checking application health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Application: Healthy"
else
    echo "❌ Application: Unhealthy (HTTP $HEALTH_RESPONSE)"
    exit 1
fi

# Check database connectivity
echo "Checking database connectivity..."
DB_CHECK=$(curl -s http://localhost:3000/api/v1/dashboard/overview | jq -r '.data.systemStatus.status')
if [ "$DB_CHECK" = "operational" ]; then
    echo "✅ Database: Connected"
else
    echo "❌ Database: Connection issues"
    exit 1
fi

# Check queue status
echo "Checking queue status..."
QUEUE_BACKLOG=$(curl -s http://localhost:3000/api/v1/dashboard/overview | jq -r '.data.processing.analysisBacklog')
if [ "$QUEUE_BACKLOG" -lt 10000 ]; then
    echo "✅ Queues: Normal backlog ($QUEUE_BACKLOG items)"
else
    echo "⚠️ Queues: High backlog ($QUEUE_BACKLOG items)"
fi

echo "✅ Health check completed successfully"
```

## Security Hardening

### 1. Environment Security

```bash
# scripts/security-hardening.sh
#!/bin/bash

echo "🔒 Applying security hardening..."

# Update system packages
apt-get update && apt-get upgrade -y

# Install security tools
apt-get install -y fail2ban ufw

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

### 2. Container Security

```dockerfile
# Security-focused Dockerfile
FROM node:18-alpine AS builder

# Install security updates
RUN apk update && apk upgrade

# ... build steps ...

FROM node:18-alpine AS production

# Install only security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set security-focused file permissions
COPY --from=builder --chown=nodejs:nodejs /app /app
RUN chmod -R 755 /app && \
    chmod -R 700 /app/logs

# Remove unnecessary packages
RUN apk del --purge && \
    rm -rf /tmp/* /var/tmp/*

# Use non-root user
USER nodejs

# Security labels
LABEL security.scan="enabled"
LABEL security.updates="auto"

# Run with security wrapper
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

## Backup and Disaster Recovery

### 1. Database Backup Scripts

```bash
#!/bin/bash
# scripts/backup-mongodb.sh

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
MONGODB_URI="mongodb://localhost:27017"
DATABASE="sentinel-ai"

echo "🔄 Starting MongoDB backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
mongodump --uri="$MONGODB_URI" --db="$DATABASE" --out="$BACKUP_DIR/$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Upload to cloud storage (AWS S3 example)
aws s3 cp "$BACKUP_DIR/$DATE.tar.gz" "s3://sentinel-ai-backups/mongodb/"

# Cleanup old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "✅ MongoDB backup completed: $DATE.tar.gz"
```

```bash
#!/bin/bash
# scripts/backup-redis.sh

BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🔄 Starting Redis backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create Redis backup
redis-cli --rdb "$BACKUP_DIR/dump_$DATE.rdb"

# Compress backup
gzip "$BACKUP_DIR/dump_$DATE.rdb"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/dump_$DATE.rdb.gz" "s3://sentinel-ai-backups/redis/"

# Cleanup old backups
find "$BACKUP_DIR" -name "*.rdb.gz" -mtime +7 -delete

echo "✅ Redis backup completed: dump_$DATE.rdb.gz"
```

### 2. Automated Backup Scheduling

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: sentinel-ai
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: mongodb-backup
            image: mongo:5.7
            command:
            - /bin/bash
            - -c
            - |
              DATE=$(date +%Y%m%d_%H%M%S)
              mongodump --uri="$MONGODB_URI" --db="$DATABASE" --archive | gzip > /backup/backup_$DATE.gz
              aws s3 cp /backup/backup_$DATE.gz s3://sentinel-ai-backups/mongodb/
            env:
            - name: MONGODB_URI
              value: "mongodb://mongodb-service:27017"
            - name: DATABASE
              value: "sentinel-ai"
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            emptyDir: {}
          restartPolicy: OnFailure
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

```bash
# Check logs
docker logs sentinel-ai

# Common issues:
# - Environment variables not set
# - Database connection failed
# - Port already in use
# - Insufficient permissions

# Solutions:
# Verify environment configuration
env | grep SENTINEL

# Check database connectivity
mongo $MONGODB_URI --eval "db.adminCommand('ismaster')"
redis-cli -u $REDIS_URL ping

# Check port availability
netstat -tlnp | grep 3000
```

#### 2. High Memory Usage

```bash
# Monitor memory usage
docker stats sentinel-ai

# Check Node.js heap usage
curl http://localhost:3000/api/v1/dashboard/metrics | jq '.data.resources.memoryUsage'

# Solutions:
# Increase memory limits
docker run --memory=4g sentinel-ai

# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=3072 --gc-interval=100"
```

#### 3. Database Performance Issues

```bash
# Check MongoDB performance
mongo --eval "db.runCommand({serverStatus: 1})"

# Check slow queries
mongo --eval "db.setProfilingLevel(2, {slowms: 100})"
mongo --eval "db.system.profile.find().sort({ts: -1}).limit(5)"

# Solutions:
# Add indexes
mongo sentinel-ai --eval "db.content.createIndex({'platform': 1, 'timestamps.ingested': -1})"

# Optimize queries
# Enable query profiling
# Scale database vertically or horizontally
```

### Performance Tuning

#### 1. Node.js Optimization

```bash
# Environment variables for production
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"
export UV_THREADPOOL_SIZE=64

# Enable HTTP/2
export HTTP2_ENABLED=true

# Optimize garbage collection
export NODE_OPTIONS="$NODE_OPTIONS --expose-gc --gc-interval=100"
```

#### 2. Database Optimization

```javascript
// MongoDB optimization script
// run with: mongo sentinel-ai optimization.js

// Create indexes
db.content.createIndex({"platform": 1, "timestamps.ingested": -1});
db.content.createIndex({"detectionResult.overallRisk": 1});
db.content.createIndex({"timestamps.published": -1});
db.trends.createIndex({"timeframe.start": -1, "riskAssessment.severity": 1});

// Configure MongoDB settings
db.adminCommand({
  setParameter: 1,
  internalQueryExecMaxBlockingSortBytes: 335544320
});

// Set up sharding (if applicable)
sh.enableSharding("sentinel-ai");
sh.shardCollection("sentinel-ai.content", {"platform": 1});
```

#### 3. Redis Optimization

```conf
# redis-production.conf
# Memory management
maxmemory 8gb
maxmemory-policy allkeys-lru

# Persistence optimization
save ""  # Disable RDB for performance
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Network optimization
tcp-keepalive 300
timeout 0
tcp-backlog 511

# Performance tuning
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
```

This comprehensive deployment guide provides everything needed to deploy Sentinel AI from development to production across various platforms and cloud providers.