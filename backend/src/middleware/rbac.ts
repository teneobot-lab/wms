import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler.js';

type AllowedRoles = Role[];

export function requireRole(...allowed: AllowedRoles) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.', 'AUTH_REQUIRED'));
    }

    if (!allowed.includes(req.user.role as Role)) {
      return next(new AppError(403, 'Insufficient permissions.', 'FORBIDDEN'));
    }

    next();
  };
}

// Convenience middleware sets
export const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');
export const requireManager = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER');
export const requireOperator = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR');
export const requireViewer = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER');