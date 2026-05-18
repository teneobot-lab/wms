import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AppError } from './errorHandler.js';

export interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided.', 'NO_TOKEN');
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = payload;
    }
    next();
  } catch {
    // Ignore auth errors in optional auth
    next();
  }
}

export async function validateSession(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided.', 'NO_TOKEN');
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verify session exists and is not expired
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError(401, 'Session expired or invalid.', 'INVALID_SESSION');
    }

    req.user = {
      userId: session.user.id,
      role: session.user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}