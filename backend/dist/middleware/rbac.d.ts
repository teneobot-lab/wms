import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
type AllowedRoles = Role[];
export declare function requireRole(...allowed: AllowedRoles): (req: Request, _res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, _res: Response, next: NextFunction) => void;
export declare const requireManager: (req: Request, _res: Response, next: NextFunction) => void;
export declare const requireOperator: (req: Request, _res: Response, next: NextFunction) => void;
export declare const requireViewer: (req: Request, _res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=rbac.d.ts.map