"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuth = optionalAuth;
exports.validateSession = validateSession;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const database_js_1 = require("../config/database.js");
const errorHandler_js_1 = require("./errorHandler.js");
function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errorHandler_js_1.AppError(401, 'No token provided.', 'NO_TOKEN');
        }
        const token = authHeader.substring(7);
        const payload = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        next(err);
    }
}
function optionalAuth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
            req.user = payload;
        }
        next();
    }
    catch {
        // Ignore auth errors in optional auth
        next();
    }
}
async function validateSession(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errorHandler_js_1.AppError(401, 'No token provided.', 'NO_TOKEN');
        }
        const token = authHeader.substring(7);
        const payload = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
        // Verify session exists and is not expired
        const session = await database_js_1.prisma.session.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!session || session.expiresAt < new Date()) {
            throw new errorHandler_js_1.AppError(401, 'Session expired or invalid.', 'INVALID_SESSION');
        }
        req.user = {
            userId: session.user.id,
            role: session.user.role,
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.js.map