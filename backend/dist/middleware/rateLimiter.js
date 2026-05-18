"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_js_1 = require("../config/env.js");
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_js_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_js_1.env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later.',
    },
});
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many login attempts, please try again later.',
    },
});
//# sourceMappingURL=rateLimiter.js.map