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
const createPOSchema = zod_1.z.object({
    supplierId: zod_1.z.string(),
    expectedDate: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(createItemSchema).min(1),
});
router.get('/', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const { status, supplierId, page = 1, limit = 50 } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (supplierId)
            where.supplierId = supplierId;
        const [orders, total] = await Promise.all([
            database_js_1.prisma.purchaseOrder.findMany({
                where,
                include: {
                    supplier: true,
                    items: { include: { product: true } },
                    createdByUser: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: ((page - 1) * limit),
                take: limit,
            }),
            database_js_1.prisma.purchaseOrder.count({ where }),
        ]);
        res.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const po = await database_js_1.prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: {
                supplier: true,
                items: { include: { product: true } },
                receipts: { include: { items: true } },
                createdByUser: { select: { name: true } },
            },
        });
        if (!po)
            throw new errorHandler_js_1.AppError(404, 'Purchase order not found.', 'NOT_FOUND');
        res.json({ success: true, data: po });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(createPOSchema), async (req, res, next) => {
    try {
        const data = req.body;
        const poNo = `PO-${Date.now()}`;
        const totalAmount = data.items.reduce((sum, item) => sum + item.qtyOrdered * item.unitPrice, 0);
        const po = await database_js_1.prisma.purchaseOrder.create({
            data: {
                poNo,
                supplierId: data.supplierId,
                expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
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
                supplier: true,
                items: { include: { product: true } },
            },
        });
        res.status(201).json({ success: true, data: po });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const po = await database_js_1.prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
        if (!po)
            throw new errorHandler_js_1.AppError(404, 'PO not found.', 'NOT_FOUND');
        if (!['DRAFT', 'SUBMITTED'].includes(po.status)) {
            throw new errorHandler_js_1.AppError(400, 'Cannot update PO in current status.', 'INVALID_STATUS');
        }
        const updated = await database_js_1.prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: req.body,
            include: { supplier: true, items: { include: { product: true } } },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/submit', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const po = await database_js_1.prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'SUBMITTED' },
        });
        res.json({ success: true, data: po });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/approve', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        const po = await database_js_1.prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: 'APPROVED' },
        });
        res.json({ success: true, data: po });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/receive', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(zod_1.z.object({
    receiptDate: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        poItemId: zod_1.z.string(),
        productId: zod_1.z.string(),
        qtyReceived: zod_1.z.number().min(0.001),
        binId: zod_1.z.string(),
        batchNo: zod_1.z.string().optional(),
        expiryDate: zod_1.z.string().optional(),
    })).min(1),
})), async (req, res, next) => {
    try {
        const po = await database_js_1.prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: { items: true },
        });
        if (!po)
            throw new errorHandler_js_1.AppError(404, 'PO not found.', 'NOT_FOUND');
        if (!['APPROVED', 'PARTIAL'].includes(po.status)) {
            throw new errorHandler_js_1.AppError(400, 'PO must be approved before receiving.', 'INVALID_STATUS');
        }
        const { items, receiptDate, notes } = req.body;
        const grNo = `GR-${Date.now()}`;
        // Atomic transaction
        const result = await database_js_1.prisma.$transaction(async (tx) => {
            // Create Goods Receipt
            const gr = await tx.goodsReceipt.create({
                data: {
                    grNo,
                    poId: po.id,
                    receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
                    notes,
                    createdBy: req.user.userId,
                    items: {
                        create: items.map((item) => ({
                            poItemId: item.poItemId,
                            productId: item.productId,
                            qtyReceived: item.qtyReceived,
                            binId: item.binId,
                            batchNo: item.batchNo,
                            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
                        })),
                    },
                },
                include: { items: true },
            });
            // Update stock and create movements
            for (const item of items) {
                const poItem = po.items.find(i => i.id === item.poItemId);
                if (!poItem)
                    continue;
                // Upsert stock
                const existing = await tx.stock.findFirst({
                    where: { productId: item.productId, binId: item.binId, batchNo: item.batchNo || null },
                });
                let qtyBefore = 0;
                if (existing) {
                    qtyBefore = Number(existing.qty);
                    await tx.stock.update({
                        where: { id: existing.id },
                        data: { qty: { increment: item.qtyReceived } },
                    });
                }
                else {
                    await tx.stock.create({
                        data: {
                            productId: item.productId,
                            binId: item.binId,
                            qty: item.qtyReceived,
                            batchNo: item.batchNo,
                            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
                        },
                    });
                }
                // Create movement
                await tx.stockMovement.create({
                    data: {
                        refNo: `GR-${gr.id}`,
                        productId: item.productId,
                        type: 'RECEIPT',
                        qty: item.qtyReceived,
                        qtyBefore,
                        qtyAfter: qtyBefore + item.qtyReceived,
                        toBinId: item.binId,
                        poItemId: item.poItemId,
                        createdBy: req.user.userId,
                    },
                });
                // Update PO item qtyReceived
                await tx.purchaseOrderItem.update({
                    where: { id: item.poItemId },
                    data: { qtyReceived: { increment: item.qtyReceived } },
                });
            }
            // Check if all items fully received
            const allItems = await tx.purchaseOrderItem.findMany({ where: { poId: po.id } });
            const allReceived = allItems.every(item => Number(item.qtyReceived) >= Number(item.qtyOrdered));
            // Update PO status
            await tx.purchaseOrder.update({
                where: { id: po.id },
                data: {
                    status: allReceived ? 'RECEIVED' : 'PARTIAL',
                    receivedDate: allReceived ? new Date() : undefined,
                },
            });
            return gr;
        });
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map