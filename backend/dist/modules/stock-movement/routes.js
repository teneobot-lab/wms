"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_js_1 = require("../../config/database.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const validate_js_1 = require("../../middleware/validate.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.authenticate, rbac_js_1.requireViewer, (0, validate_js_1.validateQuery)(zod_1.z.object({
    productId: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().default(1),
    limit: zod_1.z.coerce.number().default(50),
})), async (req, res, next) => {
    try {
        const { productId, type, dateFrom, dateTo, page, limit } = req.query;
        const where = {};
        if (productId)
            where.productId = productId;
        if (type)
            where.type = type;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = new Date(dateFrom);
            if (dateTo)
                where.createdAt.lte = new Date(dateTo);
        }
        const [movements, total] = await Promise.all([
            database_js_1.prisma.stockMovement.findMany({
                where,
                include: {
                    product: { select: { sku: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: ((page - 1) * limit),
                take: limit,
            }),
            database_js_1.prisma.stockMovement.count({ where }),
        ]);
        res.json({
            success: true,
            data: movements,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map