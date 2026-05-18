"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const database_js_1 = require("../../config/database.js");
const env_js_1 = require("../../config/env.js");
const errorHandler_js_1 = require("../../middleware/errorHandler.js");
const validate_js_1 = require("../../middleware/validate.js");
const rateLimiter_js_1 = require("../../middleware/rateLimiter.js");
const auth_js_1 = require("../../middleware/auth.js");
const router = (0, express_1.Router)();
// ─── SCHEMAS ──────────────────────────────────────────────────────────────────
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address.'),
    password: zod_1.z.string().min(1, 'Password is required.'),
});
// ─── HELPERS ───────────────────────────────────────────────────────────────────
function generateTokens(payload) {
    const accessToken = jsonwebtoken_1.default.sign(payload, env_js_1.env.JWT_SECRET, {
        expiresIn: env_js_1.env.JWT_EXPIRES_IN,
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, env_js_1.env.JWT_REFRESH_SECRET, {
        expiresIn: env_js_1.env.JWT_REFRESH_EXPIRES_IN,
    });
    return { accessToken, refreshToken };
}
function generateRefNo(prefix, id) {
    return `${prefix}-${Date.now()}-${id.slice(-4).toUpperCase()}`;
}
// ─── POST /api/auth/login ────────────────────────────────────────────────────────
router.post('/login', rateLimiter_js_1.authLimiter, (0, validate_js_1.validateBody)(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await database_js_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { warehouse: true },
        });
        if (!user) {
            throw new errorHandler_js_1.AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!validPassword) {
            throw new errorHandler_js_1.AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
        }
        const payload = { userId: user.id, role: user.role };
        const { accessToken, refreshToken } = generateTokens(payload);
        // Store session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await database_js_1.prisma.session.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt,
            },
        });
        // Log activity
        await database_js_1.prisma.activityLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN',
                entity: 'Session',
                entityId: user.id,
                ip: req.ip,
            },
        });
        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    warehouse: user.warehouse,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ─── POST /api/auth/logout ──────────────────────────────────────────────────────
router.post('/logout', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.substring(7);
        await database_js_1.prisma.session.deleteMany({
            where: { token },
        });
        res.json({ success: true, message: 'Logged out successfully.' });
    }
    catch (err) {
        next(err);
    }
});
// ─── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new errorHandler_js_1.AppError(400, 'Refresh token required.', 'TOKEN_REQUIRED');
        }
        // Verify refresh token
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(refreshToken, env_js_1.env.JWT_REFRESH_SECRET);
        }
        catch {
            throw new errorHandler_js_1.AppError(401, 'Invalid or expired refresh token.', 'INVALID_TOKEN');
        }
        // Check session
        const session = await database_js_1.prisma.session.findUnique({
            where: { token: refreshToken },
            include: { user: { include: { warehouse: true } } },
        });
        if (!session || session.expiresAt < new Date()) {
            throw new errorHandler_js_1.AppError(401, 'Session expired.', 'SESSION_EXPIRED');
        }
        // Generate new tokens
        const newPayload = { userId: session.user.id, role: session.user.role };
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(newPayload);
        // Rotate refresh token
        await database_js_1.prisma.session.update({
            where: { id: session.id },
            data: { token: newRefreshToken },
        });
        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                    role: session.user.role,
                    warehouse: session.user.warehouse,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const user = await database_js_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { warehouse: true },
        });
        if (!user) {
            throw new errorHandler_js_1.AppError(404, 'User not found.', 'USER_NOT_FOUND');
        }
        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                warehouse: user.warehouse,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map