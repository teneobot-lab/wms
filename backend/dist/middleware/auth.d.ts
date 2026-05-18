import { Request, Response, NextFunction } from 'express';
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
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare function validateSession(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map