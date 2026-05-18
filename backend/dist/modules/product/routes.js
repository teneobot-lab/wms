"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_js_1 = require("../../config/database.js");
const errorHandler_js_1 = require("../../middleware/errorHandler.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const validate_js_1 = require("../../middleware/validate.js");
const router = (0, express_1.Router)();
// ─── SCHEMAS ───────────────────────────────────────────────────────────────────
const createProductSchema = zod_1.z.object({
    sku: zod_1.z.string().min(2).max(50),
    barcode: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2).max(255),
    description: zod_1.z.string().optional(),
    categoryId: zod_1.z.string(),
    unitId: zod_1.z.string(),
    costPrice: zod_1.z.number().min(0).default(0),
    sellPrice: zod_1.z.number().min(0).default(0),
    minStock: zod_1.z.number().min(0).default(0),
    maxStock: zod_1.z.number().min(0).default(0),
    reorderPoint: zod_1.z.number().min(0).default(0),
    weight: zod_1.z.number().optional(),
    dimensions: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
});
const updateProductSchema = createProductSchema.partial();
// ─── GET /api/products ─────────────────────────────────────────────────────────
router.get('/', auth_js_1.authenticate, (0, validate_js_1.validateQuery)(zod_1.z.object({
    search: zod_1.z.string().optional(),
    categoryId: zod_1.z.string().optional(),
    isActive: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().default(1),
    limit: zod_1.z.coerce.number().default(50),
    sortBy: zod_1.z.string().default('name'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
})), async (req, res, next) => {
    try {
        const { search, categoryId, isActive, page, limit, sortBy, sortOrder } = req.query;
        const skip = (page - 1) * limit;
        const where = {};
        if (categoryId)
            where.categoryId = categoryId;
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [products, total] = await Promise.all([
            database_js_1.prisma.product.findMany({
                where,
                include: {
                    category: true,
                    unit: true,
                    stocks: { select: { qty: true } },
                },
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            database_js_1.prisma.product.count({ where }),
        ]);
        const data = products.map((p) => {
            const totalQty = p.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
            return {
                ...p,
                totalQty,
                stocks: undefined,
            };
        });
        res.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/products/:id ─────────────────────────────────────────────────────
router.get('/:id', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const product = await database_js_1.prisma.product.findUnique({
            where: { id: req.params.id },
            include: {
                category: true,
                unit: true,
                stocks: { include: { bin: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } } } },
            },
        });
        if (!product) {
            throw new errorHandler_js_1.AppError(404, 'Product not found.', 'NOT_FOUND');
        }
        res.json({ success: true, data: product });
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/products/:id/stock ───────────────────────────────────────────────
router.get('/:id/stock', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const stocks = await database_js_1.prisma.stock.findMany({
            where: { productId: req.params.id },
            include: {
                bin: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        const data = stocks.map((s) => ({
            id: s.id,
            binId: s.binId,
            binCode: s.bin.code,
            rackCode: s.bin.rack.code,
            zoneName: s.bin.rack.zone.name,
            warehouseName: s.bin.rack.zone.warehouse.name,
            qty: Number(s.qty),
            reservedQty: Number(s.reservedQty),
            available: Number(s.qty) - Number(s.reservedQty),
            batchNo: s.batchNo,
            expiryDate: s.expiryDate,
            updatedAt: s.updatedAt,
        }));
        const totalQty = data.reduce((sum, s) => sum + s.qty, 0);
        const totalReserved = data.reduce((sum, s) => sum + s.reservedQty, 0);
        res.json({ success: true, data: { stocks: data, summary: { totalQty, totalReserved, available: totalQty - totalReserved } } });
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/products/:id/movements ───────────────────────────────────────────
router.get('/:id/movements', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const movements = await database_js_1.prisma.stockMovement.findMany({
            where: { productId: req.params.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json({ success: true, data: movements });
    }
    catch (err) {
        next(err);
    }
});
// ─── POST /api/products ───────────────────────────────────────────────────────
router.post('/', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(createProductSchema), async (req, res, next) => {
    try {
        const data = req.body;
        const product = await database_js_1.prisma.product.create({
            data: {
                ...data,
                costPrice: data.costPrice || 0,
                sellPrice: data.sellPrice || 0,
            },
            include: { category: true, unit: true },
        });
        await database_js_1.prisma.activityLog.create({
            data: {
                userId: req.user.userId,
                action: 'CREATE',
                entity: 'Product',
                entityId: product.id,
                newValues: product,
            },
        });
        res.status(201).json({ success: true, data: product });
    }
    catch (err) {
        next(err);
    }
});
// ─── PUT /api/products/:id ────────────────────────────────────────────────────
router.put('/:id', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(updateProductSchema), async (req, res, next) => {
    try {
        const existing = await database_js_1.prisma.product.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw new errorHandler_js_1.AppError(404, 'Product not found.', 'NOT_FOUND');
        const product = await database_js_1.prisma.product.update({
            where: { id: req.params.id },
            data: req.body,
            include: { category: true, unit: true },
        });
        await database_js_1.prisma.activityLog.create({
            data: {
                userId: req.user.userId,
                action: 'UPDATE',
                entity: 'Product',
                entityId: product.id,
                oldValues: existing,
                newValues: product,
            },
        });
        res.json({ success: true, data: product });
    }
    catch (err) {
        next(err);
    }
});
// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
router.delete('/:id', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const product = await database_js_1.prisma.product.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });
        await database_js_1.prisma.activityLog.create({
            data: {
                userId: req.user.userId,
                action: 'DELETE',
                entity: 'Product',
                entityId: product.id,
            },
        });
        res.json({ success: true, message: 'Product deactivated.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map