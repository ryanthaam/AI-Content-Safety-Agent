import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { logger } from '@/utils/logger';
import { connectDatabase } from '@/core/database';
import { connectRedis } from '@/core/redis';
import { apiRoutes } from '@/api/routes';
import { errorHandler } from '@/api/middleware/errorHandler';
import { rateLimiter } from '@/api/middleware/rateLimiter';
import { ContentIngestionService } from '@/services/ContentIngestionService';
import { TrendAnalysisService } from '@/services/TrendAnalysisService';
import { ContentDetectionService } from '@/services/ContentDetectionService';

class SentinelAIServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(rateLimiter);
  }

  private setupRoutes(): void {
    this.app.use('/api/v1', apiRoutes);
    
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    this.app.get('/', (req, res) => {
      res.json({
        name: 'Sentinel AI Content Safety Agent',
        version: '1.0.0',
        description: 'Intelligent real-time content safety system',
        documentation: '/api/v1/docs',
      });
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('join-room', (room: string) => {
        socket.join(room);
        logger.info(`Client ${socket.id} joined room: ${room}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      logger.info('Initializing core services...');

      const contentIngestionService = new ContentIngestionService();
      const contentDetectionService = new ContentDetectionService();
      const trendAnalysisService = new TrendAnalysisService();

      await contentIngestionService.initialize();
      await contentDetectionService.initialize();
      await trendAnalysisService.initialize();

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await connectDatabase();
      await connectRedis();
      await this.initializeServices();

      this.server.listen(this.port, () => {
        logger.info(`🚀 Sentinel AI Server running on port ${this.port}`);
        logger.info(`📊 Health check: http://localhost:${this.port}/health`);
        logger.info(`📚 API docs: http://localhost:${this.port}/api/v1/docs`);
        logger.info(`🔄 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getIOInstance(): SocketIOServer {
    return this.io;
  }
}

const server = new SentinelAIServer();

if (require.main === module) {
  server.start().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

export { server };
export default server;