import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public errors?: unknown[]
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      errors: err.errors,
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const e = err as any;
    if (e.code === 'P2002') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists.',
      });
    }
    if (e.code === 'P2025') {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Record not found.',
      });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'AUTH_ERROR',
      message: 'Invalid or expired token.',
    });
  }

  // Unknown error
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
}