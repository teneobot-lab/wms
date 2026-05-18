"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const errorHandler_js_1 = require("./errorHandler.js");
function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return next(new errorHandler_js_1.AppError(400, 'Validation failed.', 'VALIDATION_ERROR', errors));
        }
        req.body = result.data;
        next();
    };
}
function validateQuery(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            const errors = result.error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return next(new errorHandler_js_1.AppError(400, 'Invalid query parameters.', 'VALIDATION_ERROR', errors));
        }
        req.query = result.data;
        next();
    };
}
function validateParams(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            const errors = result.error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return next(new errorHandler_js_1.AppError(400, 'Invalid parameters.', 'VALIDATION_ERROR', errors));
        }
        next();
    };
}
//# sourceMappingURL=validate.js.map