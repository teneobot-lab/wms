"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireViewer = exports.requireOperator = exports.requireManager = exports.requireAdmin = void 0;
exports.requireRole = requireRole;
const errorHandler_js_1 = require("./errorHandler.js");
function requireRole(...allowed) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errorHandler_js_1.AppError(401, 'Authentication required.', 'AUTH_REQUIRED'));
        }
        if (!allowed.includes(req.user.role)) {
            return next(new errorHandler_js_1.AppError(403, 'Insufficient permissions.', 'FORBIDDEN'));
        }
        next();
    };
}
// Convenience middleware sets
exports.requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');
exports.requireManager = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER');
exports.requireOperator = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR');
exports.requireViewer = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER');
//# sourceMappingURL=rbac.js.map