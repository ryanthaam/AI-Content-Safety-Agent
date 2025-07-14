import { Router } from 'express';
import { asyncHandler } from '@/api/middleware/errorHandler';

const router = Router();

router.get('/status', asyncHandler(async (req, res) => {
  res.json({
    authenticated: false,
    message: 'Authentication system not yet implemented',
    timestamp: new Date(),
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Authentication system not yet implemented',
    message: 'This endpoint will be available in Phase 4',
  });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  res.status(501).json({
    error: 'Authentication system not yet implemented',
    message: 'This endpoint will be available in Phase 4',
  });
}));

export { router as authRoutes };