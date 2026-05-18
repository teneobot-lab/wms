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
const createItemSchema = zod_1.z.object({
    productId: zod_1.z.string(),
    qtyOrdered: zod_1.z.number().min(0.001),
    unitPrice: zod_1.z.number().min(0),
    notes: zod_1.z.string().optional(),
});
const createSOSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    requiredDate: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(createItemSchema).min(1),
});
router.get('/', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const { status, customerId, page = 1, limit = 50 } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (customerId)
            where.customerId = customerId;
        const [orders, total] = await Promise.all([
            database_js_1.prisma.salesOrder.findMany({
                where,
                include: {
                    customer: true,
                    items: { include: { product: true } },
                    createdByUser: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: ((page - 1) * limit),
                take: limit,
            }),
            database_js_1.prisma.salesOrder.count({ where }),
        ]);
        res.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const so = await database_js_1.prisma.salesOrder.findUnique({
            where: { id: req.params.id },
            include: {
                customer: true,
                items: { include: { product: true } },
                pickings: { include: { items: true } },
                createdByUser: { select: { name: true } },
            },
        });
        if (!so)
            throw new errorHandler_js_1.AppError(404, 'Sales order not found.', 'NOT_FOUND');
        res.json({ success: true, data: so });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(createSOSchema), async (req, res, next) => {
    try {
        const data = req.body;
        const soNo = `SO-${Date.now()}`;
        const totalAmount = data.items.reduce((sum, item) => sum + item.qtyOrdered * item.unitPrice, 0);
        const so = await database_js_1.prisma.salesOrder.create({
            data: {
                soNo,
                customerId: data.customerId,
                requiredDate: data.requiredDate ? new Date(data.requiredDate) : undefined,
                notes: data.notes,
                totalAmount,
                createdBy: req.user.userId,
                items: {
                    create: data.items.map((item) => ({
                        productId: item.productId,
                        qtyOrdered: item.qtyOrdered,
                        unitPrice: item.unitPrice,
                        totalPrice: item.qtyOrdered * item.unitPrice,
                        notes: item.notes,
                    })),
                },
            },
            include: {
                customer: true,
                items: { include: { product: true } },
            },
        });
        res.status(201).json({ success: true, data: so });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/confirm', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        // Validate stock availability
        const so = await database_js_1.prisma.salesOrder.findUnique({
            where: { id: req.params.id },
            include: { items: { include: { product: { include: { stocks: true } } } } },
        });
        if (!so)
            throw new errorHandler_js_1.AppError(404, 'SO not found.', 'NOT_FOUND');
        for (const item of so.items) {
            const totalStock = item.product.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
            if (totalStock < Number(item.qtyOrdered)) {
                throw new errorHandler_js_1.AppError(400, `Insufficient stock for ${item.product.name}. Available: ${totalStock}`, 'INSUFFICIENT_STOCK');
            }
        }
        const updated = await database_js_1.prisma.salesOrder.update({
            where: { id: req.params.id },
            data: { status: 'CONFIRMED' },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/picking', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const so = await database_js_1.prisma.salesOrder.findUnique({
            where: { id: req.params.id },
            include: { items: true },
        });
        if (!so)
            throw new errorHandler_js_1.AppError(404, 'SO not found.', 'NOT_FOUND');
        if (!['CONFIRMED', 'PICKING'].includes(so.status)) {
            throw new errorHandler_js_1.AppError(400, 'SO must be confirmed before picking.', 'INVALID_STATUS');
        }
        const pickNo = `PICK-${Date.now()}`;
        const result = await database_js_1.prisma.$transaction(async (tx) => {
            // Create picking order
            const picking = await tx.pickingOrder.create({
                data: {
                    pickNo,
                    soId: so.id,
                    status: 'PENDING',
                    createdBy: req.user.userId,
                },
            });
            // Create picking items (find stock locations)
            for (const soItem of so.items) {
                // Find bins with stock
                const stocks = await tx.stock.findMany({
                    where: {
                        productId: soItem.productId,
                        qty: { gt: 0 },
                    },
                    include: { bin: true },
                    orderBy: { qty: 'desc' },
                });
                let remaining = Number(soItem.qtyOrdered);
                for (const stock of stocks) {
                    if (remaining <= 0)
                        break;
                    const pickQty = Math.min(remaining, Number(stock.qty));
                    await tx.pickingItem.create({
                        data: {
                            pickId: picking.id,
                            soItemId: soItem.id,
                            productId: soItem.productId,
                            binId: stock.binId,
                            qtyRequired: pickQty,
                        },
                    });
                    remaining -= pickQty;
                }
            }
            // Update SO status
            await tx.salesOrder.update({
                where: { id: so.id },
                data: { status: 'PICKING' },
            });
            return picking;
        });
        const pickingWithItems = await database_js_1.prisma.pickingOrder.findUnique({
            where: { id: result.id },
            include: { items: true },
        });
        res.status(201).json({ success: true, data: pickingWithItems });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/complete-pick', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(zod_1.z.object({
    pickingId: zod_1.z.string(),
    items: zod_1.z.array(zod_1.z.object({
        pickItemId: zod_1.z.string(),
        qtyPicked: zod_1.z.number().min(0),
    })),
})), async (req, res, next) => {
    try {
        const { pickingId, items } = req.body;
        const so = await database_js_1.prisma.salesOrder.findUnique({
            where: { id: req.params.id },
            include: { pickings: { include: { items: true } } },
        });
        if (!so)
            throw new errorHandler_js_1.AppError(404, 'SO not found.', 'NOT_FOUND');
        await database_js_1.prisma.$transaction(async (tx) => {
            for (const item of items) {
                const pickItem = await tx.pickingItem.findUnique({ where: { id: item.pickItemId } });
                if (!pickItem || !item.qtyPicked)
                    continue;
                // Get current stock
                const stock = await tx.stock.findFirst({
                    where: { productId: pickItem.productId, binId: pickItem.binId },
                });
                if (stock) {
                    // Deduct stock
                    await tx.stock.update({
                        where: { id: stock.id },
                        data: { qty: { decrement: item.qtyPicked } },
                    });
                    // Get updated qty
                    const updatedStock = await tx.stock.findUnique({ where: { id: stock.id } });
                    // Create movement
                    await tx.stockMovement.create({
                        data: {
                            refNo: `SO-${so.id}`,
                            productId: pickItem.productId,
                            type: 'ISSUE',
                            qty: item.qtyPicked,
                            qtyBefore: Number(stock.qty),
                            qtyAfter: Number(updatedStock?.qty || 0),
                            fromBinId: pickItem.binId,
                            soItemId: pickItem.soItemId,
                            createdBy: req.user.userId,
                            notes: `SO: ${so.soNo}`,
                        },
                    });
                }
                // Update picking item
                await tx.pickingItem.update({
                    where: { id: item.pickItemId },
                    data: { qtyPicked: item.qtyPicked, isDone: item.qtyPicked >= Number(pickItem.qtyRequired) },
                });
                // Update SO item qtyPicked
                await tx.salesOrderItem.update({
                    where: { id: pickItem.soItemId },
                    data: { qtyPicked: { increment: item.qtyPicked } },
                });
            }
            // Check if all pickings done
            const picking = await tx.pickingOrder.findUnique({
                where: { id: pickingId },
                include: { items: true },
            });
            const allDone = picking?.items.every(i => i.isDone);
            if (allDone) {
                await tx.pickingOrder.update({ where: { id: pickingId }, data: { status: 'DONE' } });
                await tx.salesOrder.update({
                    where: { id: so.id },
                    data: { status: 'PACKED' },
                });
            }
        });
        res.json({ success: true, message: 'Pick completed.' });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const so = await database_js_1.prisma.salesOrder.findUnique({ where: { id: req.params.id } });
        if (!so)
            throw new errorHandler_js_1.AppError(404, 'SO not found.', 'NOT_FOUND');
        if (!['DRAFT'].includes(so.status)) {
            throw new errorHandler_js_1.AppError(400, 'Cannot update SO in current status.', 'INVALID_STATUS');
        }
        const updated = await database_js_1.prisma.salesOrder.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/ship', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const so = await database_js_1.prisma.salesOrder.findUnique({ where: { id: req.params.id } });
        if (!so)
            throw new errorHandler_js_1.AppError(404, 'SO not found.', 'NOT_FOUND');
        if (!['CONFIRMED', 'PICKING', 'PACKED'].includes(so.status)) {
            throw new errorHandler_js_1.AppError(400, 'SO tidak dapat dikirim.', 'INVALID_STATUS');
        }
        const updated = await database_js_1.prisma.salesOrder.update({
            where: { id: req.params.id },
            data: { status: 'SHIPPED', shippedDate: new Date() },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/cancel', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const so = await database_js_1.prisma.salesOrder.findUnique({ where: { id: req.params.id } });
        if (!so)
            throw new errorHandler_js_1.AppError(404, 'SO not found.', 'NOT_FOUND');
        if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(so.status)) {
            throw new errorHandler_js_1.AppError(400, 'SO tidak dapat dibatalkan.', 'INVALID_STATUS');
        }
        const updated = await database_js_1.prisma.salesOrder.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map