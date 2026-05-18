"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const env_js_1 = require("./config/env.js");
const logger_js_1 = require("./config/logger.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
// ─── ROUTES ──────────────────────────────────────────────────────────────────
const routes_js_1 = __importDefault(require("./modules/auth/routes.js"));
const routes_js_2 = __importDefault(require("./modules/dashboard/routes.js"));
const routes_js_3 = __importDefault(require("./modules/product/routes.js"));
const routes_js_4 = __importDefault(require("./modules/supplier/routes.js"));
const routes_js_5 = __importDefault(require("./modules/customer/routes.js"));
const routes_js_6 = __importDefault(require("./modules/warehouse/routes.js"));
const routes_js_7 = __importDefault(require("./modules/user/routes.js"));
const routes_js_8 = __importDefault(require("./modules/purchase-order/routes.js"));
const routes_js_9 = __importDefault(require("./modules/sales-order/routes.js"));
const routes_js_10 = __importDefault(require("./modules/stock-movement/routes.js"));
const routes_js_11 = __importDefault(require("./modules/transfer/routes.js"));
const routes_js_12 = __importDefault(require("./modules/adjustment/routes.js"));
const routes_js_13 = __importDefault(require("./modules/reports/routes.js"));
const routes_js_14 = __importDefault(require("./modules/search/routes.js"));
const app = (0, express_1.default)();
// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined', { stream: { write: (msg) => logger_js_1.logger.http(msg.trim()) } }));
app.use((0, cors_1.default)({
    origin: env_js_1.env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ─── API LIMITS ────────────────────────────────────────────────────────────────
app.use('/api', rateLimiter_js_1.apiLimiter);
// ─── API ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', routes_js_1.default);
app.use('/api/dashboard', routes_js_2.default);
app.use('/api/products', routes_js_3.default);
app.use('/api/suppliers', routes_js_4.default);
app.use('/api/customers', routes_js_5.default);
app.use('/api/warehouses', routes_js_6.default);
app.use('/api/users', routes_js_7.default);
app.use('/api/purchase-orders', routes_js_8.default);
app.use('/api/sales-orders', routes_js_9.default);
app.use('/api/stock-movements', routes_js_10.default);
app.use('/api/transfers', routes_js_11.default);
app.use('/api/adjustments', routes_js_12.default);
app.use('/api/reports', routes_js_13.default);
app.use('/api/search', routes_js_14.default);
// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Endpoint not found.',
    });
});
// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use(errorHandler_js_1.errorHandler);
app.listen(env_js_1.env.PORT, () => {
    logger_js_1.logger.info(`🚀 Warehouse WMS API running on port ${env_js_1.env.PORT}`);
    logger_js_1.logger.info(`   Environment: ${env_js_1.env.NODE_ENV}`);
    logger_js_1.logger.info(`   Database: ${env_js_1.env.DATABASE_URL.split('@')[1]}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map