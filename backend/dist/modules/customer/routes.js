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
const createSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(50),
    name: zod_1.z.string().min(2).max(255),
    contact: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
});
router.get('/', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const { search, isActive, page = 1, limit = 50 } = req.query;
        const where = {};
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [customers, total] = await Promise.all([
            database_js_1.prisma.customer.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: ((page - 1) * limit),
                take: limit,
            }),
            database_js_1.prisma.customer.count({ where }),
        ]);
        res.json({ success: true, data: customers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const customer = await database_js_1.prisma.customer.findUnique({ where: { id: req.params.id } });
        if (!customer)
            throw new errorHandler_js_1.AppError(404, 'Customer not found.', 'NOT_FOUND');
        res.json({ success: true, data: customer });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(createSchema), async (req, res, next) => {
    try {
        const customer = await database_js_1.prisma.customer.create({ data: req.body });
        res.status(201).json({ success: true, data: customer });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(createSchema.partial()), async (req, res, next) => {
    try {
        const customer = await database_js_1.prisma.customer.update({ where: { id: req.params.id }, data: req.body });
        res.json({ success: true, data: customer });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', auth_js_1.authenticate, rbac_js_1.requireOperator, async (req, res, next) => {
    try {
        await database_js_1.prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } });
        res.json({ success: true, message: 'Customer deactivated.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map