import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A unique constraint was violated';
    details = err.meta?.target;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found in database';
  } else {
    logger.error('Unhandled server error:', err);
    if (process.env.NODE_ENV === 'development') {
      message = err.message || message;
      details = err.stack;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
  });
};
