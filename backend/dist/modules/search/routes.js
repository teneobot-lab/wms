"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../../config/database.js");
const auth_js_1 = require("../../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /api/search/products?q=
router.get('/products', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const products = await database_js_1.prisma.product.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { sku: { contains: q, mode: 'insensitive' } },
                    { barcode: { contains: q, mode: 'insensitive' } },
                ],
            },
            include: {
                unit: true,
                stocks: { select: { qty: true } },
            },
            take: 12,
            orderBy: { name: 'asc' },
        });
        const data = products.map(p => {
            const totalQty = p.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
            return {
                id: p.id,
                sku: p.sku,
                name: p.name,
                barcode: p.barcode,
                unit: p.unit.name,
                costPrice: Number(p.costPrice),
                sellPrice: Number(p.sellPrice),
                totalQty,
                reorderPoint: p.reorderPoint,
                isLowStock: totalQty <= p.reorderPoint,
                label: p.name,
                secondary: p.sku,
            };
        });
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/search/suppliers?q=
router.get('/suppliers', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const suppliers = await database_js_1.prisma.supplier.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: q } },
                    { code: { contains: q } },
                ],
            },
            take: 12,
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: suppliers.map(s => ({ id: s.id, code: s.code, name: s.name, phone: s.phone, email: s.email, label: s.name, secondary: s.code })) });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/search/customers?q=
router.get('/customers', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const customers = await database_js_1.prisma.customer.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: q } },
                    { code: { contains: q } },
                ],
            },
            take: 12,
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: customers.map(c => ({ id: c.id, code: c.code, name: c.name, phone: c.phone, email: c.email, label: c.name, secondary: c.code })) });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/search/bins?q=
router.get('/bins', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const bins = await database_js_1.prisma.bin.findMany({
            where: {
                code: { contains: q },
            },
            include: {
                rack: { include: { zone: { include: { warehouse: true } } } },
            },
            take: 12,
            orderBy: { code: 'asc' },
        });
        res.json({
            success: true,
            data: bins.map(b => ({
                id: b.id,
                code: b.code,
                rack: b.rack.code,
                zone: b.rack.zone.name,
                warehouse: b.rack.zone.warehouse.name,
                fullPath: `${b.rack.zone.warehouse.name} > ${b.rack.zone.name} > ${b.rack.code} > ${b.code}`,
                label: b.code,
                secondary: `${b.rack.zone.warehouse.name} > ${b.rack.zone.name} > ${b.rack.code}`,
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/search/categories?q=
router.get('/categories', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const where = q
            ? {
                OR: [
                    { name: { contains: q } },
                    { code: { contains: q } },
                ],
            }
            : {};
        const categories = await database_js_1.prisma.category.findMany({
            where,
            include: { parent: true },
            take: 12,
            orderBy: { name: 'asc' },
        });
        res.json({
            success: true,
            data: categories.map(c => ({
                id: c.id,
                code: c.code,
                name: c.name,
                parent: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
                label: c.name,
                secondary: c.code,
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/search/units?q=
router.get('/units', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const where = q
            ? {
                OR: [
                    { name: { contains: q } },
                    { code: { contains: q } },
                ],
            }
            : {};
        const units = await database_js_1.prisma.unit.findMany({
            where,
            take: 12,
            orderBy: { name: 'asc' },
        });
        res.json({
            success: true,
            data: units.map(u => ({
                id: u.id,
                code: u.code,
                name: u.name,
                label: u.name,
                secondary: u.code,
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map