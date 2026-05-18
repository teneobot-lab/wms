"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const logger_js_1 = require("../config/logger.js");
class AppError extends Error {
    statusCode;
    code;
    errors;
    constructor(statusCode, message, code, errors) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.errors = errors;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    logger_js_1.logger.error(err);
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
        const e = err;
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
//# sourceMappingURL=errorHandler.js.map