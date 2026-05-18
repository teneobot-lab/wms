import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    errors?: unknown[] | undefined;
    constructor(statusCode: number, message: string, code?: string | undefined, errors?: unknown[] | undefined);
}
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=errorHandler.d.ts.map