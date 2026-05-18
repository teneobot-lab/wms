import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// ─── ROUTES ──────────────────────────────────────────────────────────────────
import authRoutes from './modules/auth/routes.js';
import dashboardRoutes from './modules/dashboard/routes.js';
import productRoutes from './modules/product/routes.js';
import supplierRoutes from './modules/supplier/routes.js';
import customerRoutes from './modules/customer/routes.js';
import warehouseRoutes from './modules/warehouse/routes.js';
import purchaseOrderRoutes from './modules/purchase-order/routes.js';
import salesOrderRoutes from './modules/sales-order/routes.js';
import stockMovementRoutes from './modules/stock-movement/routes.js';
import transferRoutes from './modules/transfer/routes.js';
import adjustmentRoutes from './modules/adjustment/routes.js';
import reportsRoutes from './modules/reports/routes.js';
import searchRoutes from './modules/search/routes.js';

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API LIMITS ────────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── API ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/search', searchRoutes);

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'Endpoint not found.',
  });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`🚀 Warehouse WMS API running on port ${env.PORT}`);
  logger.info(`   Environment: ${env.NODE_ENV}`);
  logger.info(`   Database: ${env.DATABASE_URL.split('@')[1]}`);
});

export default app;