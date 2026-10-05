import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import { NotFoundError } from './utils/errors';

export const createApp = () => {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or matching frontends
        if (!origin || origin === ENV.FRONTEND_URL || origin.includes('localhost')) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev, can restrict in production
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Request Parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Logging
  if (ENV.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Root and Health Check Endpoints (for Render and uptime monitors)
  app.get(['/', '/health'], (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'CollabRoom API Server',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Global Rate Limiting
  app.use('/api', globalLimiter);

  // Mount API
  app.use('/api', apiRouter);

  // Catch unmatched routes
  app.use('*', (req, res, next) => {
    next(new NotFoundError(`API Route ${req.originalUrl} not found`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
