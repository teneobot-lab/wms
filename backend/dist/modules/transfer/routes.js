"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_js_1 = require("../../config/database.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const validate_js_1 = require("../../middleware/validate.js");
const router = (0, express_1.Router)();
router.post('/', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(zod_1.z.object({
    fromBinId: zod_1.z.string(),
    toBinId: zod_1.z.string(),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string(),
        qty: zod_1.z.number().min(0.001),
        batchNo: zod_1.z.string().optional(),
    })).min(1),
    notes: zod_1.z.string().optional(),
})), async (req, res, next) => {
    try {
        const { fromBinId, toBinId, items, notes } = req.body;
        if (fromBinId === toBinId) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_TRANSFER',
                message: 'Source and destination bin cannot be the same.',
            });
        }
        const result = await database_js_1.prisma.$transaction(async (tx) => {
            for (const item of items) {
                // Find source stock
                const sourceStock = await tx.stock.findFirst({
                    where: {
                        productId: item.productId,
                        binId: fromBinId,
                        batchNo: item.batchNo || null,
                    },
                });
                if (!sourceStock) {
                    throw new Error(`No stock found for product ${item.productId} in source bin.`);
                }
                if (Number(sourceStock.qty) < item.qty) {
                    throw new Error(`Insufficient stock for product ${item.productId}. Available: ${sourceStock.qty}`);
                }
                // Deduct from source
                const qtyBefore = Number(sourceStock.qty);
                await tx.stock.update({
                    where: { id: sourceStock.id },
                    data: { qty: { decrement: item.qty } },
                });
                const updatedSource = await tx.stock.findUnique({ where: { id: sourceStock.id } });
                // Create movement for deduction
                await tx.stockMovement.create({
                    data: {
                        refNo: `TR-${Date.now()}`,
                        productId: item.productId,
                        type: 'TRANSFER',
                        qty: item.qty,
                        qtyBefore,
                        qtyAfter: Number(updatedSource?.qty || qtyBefore - item.qty),
                        fromBinId,
                        toBinId,
                        createdBy: req.user.userId,
                        notes: notes || `Transfer from bin to bin`,
                    },
                });
                // Add to destination
                const destStock = await tx.stock.findFirst({
                    where: {
                        productId: item.productId,
                        binId: toBinId,
                        batchNo: item.batchNo || null,
                    },
                });
                if (destStock) {
                    await tx.stock.update({
                        where: { id: destStock.id },
                        data: { qty: { increment: item.qty } },
                    });
                }
                else {
                    await tx.stock.create({
                        data: {
                            productId: item.productId,
                            binId: toBinId,
                            qty: item.qty,
                            batchNo: item.batchNo,
                        },
                    });
                }
            }
            return { success: true, message: 'Transfer completed successfully.' };
        });
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// GET / — list all transfers
router.get('/', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [transfers, total] = await Promise.all([
            database_js_1.prisma.stockMovement.findMany({
                where: { type: 'TRANSFER' },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: true,
                },
            }),
            database_js_1.prisma.stockMovement.count({ where: { type: 'TRANSFER' } }),
        ]);
        res.json({
            success: true,
            data: transfers,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map