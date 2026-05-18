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
router.get('/', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const where = {};
        if (status)
            where.status = status;
        const [adjustments, total] = await Promise.all([
            database_js_1.prisma.stockAdjustment.findMany({
                where,
                include: {
                    items: true,
                    createdByUser: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: ((page - 1) * limit),
                take: limit,
            }),
            database_js_1.prisma.stockAdjustment.count({ where }),
        ]);
        res.json({ success: true, data: adjustments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const adj = await database_js_1.prisma.stockAdjustment.findUnique({
            where: { id: req.params.id },
            include: {
                items: true,
                createdByUser: { select: { name: true } },
            },
        });
        if (!adj)
            throw new errorHandler_js_1.AppError(404, 'Adjustment not found.', 'NOT_FOUND');
        res.json({ success: true, data: adj });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(zod_1.z.object({
    reason: zod_1.z.string().min(1),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string(),
        binId: zod_1.z.string(),
        qtySystem: zod_1.z.number().min(0),
        qtyActual: zod_1.z.number().min(0),
        notes: zod_1.z.string().optional(),
    })).min(1),
})), async (req, res, next) => {
    try {
        const { reason, notes, items } = req.body;
        const adjNo = `ADJ-${Date.now()}`;
        const adjustment = await database_js_1.prisma.$transaction(async (tx) => {
            const adj = await tx.stockAdjustment.create({
                data: {
                    adjNo,
                    reason,
                    notes,
                    status: 'DRAFT',
                    createdBy: req.user.userId,
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            binId: item.binId,
                            qtySystem: item.qtySystem,
                            qtyActual: item.qtyActual,
                            difference: item.qtyActual - item.qtySystem,
                            notes: item.notes,
                        })),
                    },
                },
                include: { items: true },
            });
            return adj;
        });
        res.status(201).json({ success: true, data: adjustment });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/submit', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const adj = await database_js_1.prisma.stockAdjustment.update({
            where: { id: req.params.id },
            data: { status: 'SUBMITTED' },
        });
        res.json({ success: true, data: adj });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/approve', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const adjustment = await database_js_1.prisma.stockAdjustment.findUnique({
            where: { id: req.params.id },
            include: { items: true },
        });
        if (!adjustment)
            throw new errorHandler_js_1.AppError(404, 'Adjustment not found.', 'NOT_FOUND');
        if (adjustment.status !== 'SUBMITTED') {
            throw new errorHandler_js_1.AppError(400, 'Only submitted adjustments can be approved.', 'INVALID_STATUS');
        }
        const result = await database_js_1.prisma.$transaction(async (tx) => {
            for (const item of adjustment.items) {
                const stock = await tx.stock.findFirst({
                    where: { productId: item.productId, binId: item.binId },
                });
                if (stock) {
                    const qtyBefore = Number(stock.qty);
                    const qtyAfter = Number(item.qtyActual);
                    const diff = Number(item.difference);
                    await tx.stock.update({
                        where: { id: stock.id },
                        data: { qty: item.qtyActual },
                    });
                    await tx.stockMovement.create({
                        data: {
                            refNo: `ADJ-${adjustment.id}`,
                            productId: item.productId,
                            type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                            qty: Math.abs(diff),
                            qtyBefore,
                            qtyAfter,
                            fromBinId: diff < 0 ? item.binId : undefined,
                            toBinId: diff >= 0 ? item.binId : undefined,
                            adjustmentId: adjustment.id,
                            createdBy: req.user.userId,
                            notes: `Adjustment: ${adjustment.reason}`,
                        },
                    });
                }
            }
            const updated = await tx.stockAdjustment.update({
                where: { id: adjustment.id },
                data: { status: 'APPROVED', approvedBy: req.user.userId },
            });
            return updated;
        });
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/reject', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const adj = await database_js_1.prisma.stockAdjustment.update({
            where: { id: req.params.id },
            data: { status: 'REJECTED' },
        });
        res.json({ success: true, data: adj });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map