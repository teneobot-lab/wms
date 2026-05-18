import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare function validateBody<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
export declare function validateQuery<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
export declare function validateParams<T>(schema: ZodSchema<T>): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map