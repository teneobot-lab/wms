"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../../config/database.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const router = (0, express_1.Router)();
// GET /api/reports/stock-summary
router.get('/stock-summary', auth_js_1.authenticate, rbac_js_1.requireViewer, async (req, res, next) => {
    try {
        const { warehouseId } = req.query;
        const stocks = await database_js_1.prisma.stock.findMany({
            include: {
                product: { include: { category: true, unit: true } },
                bin: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } },
            },
        });
        let data = stocks.map(s => ({
            productId: s.product.id,
            sku: s.product.sku,
            name: s.product.name,
            category: s.product.category.name,
            unit: s.product.unit.name,
            bin: s.bin.code,
            rack: s.bin.rack.code,
            zone: s.bin.rack.zone.name,
            warehouse: s.bin.rack.zone.warehouse.name,
            qty: Number(s.qty),
            reserved: Number(s.reservedQty),
            available: Number(s.qty) - Number(s.reservedQty),
            batchNo: s.batchNo,
            expiryDate: s.expiryDate,
            costPrice: Number(s.product.costPrice),
            sellPrice: Number(s.product.sellPrice),
        }));
        if (warehouseId) {
            data = data.filter(d => d.warehouse === warehouseId);
        }
        const totalQty = data.reduce((sum, d) => sum + d.qty, 0);
        const totalValue = data.reduce((sum, d) => sum + d.qty * d.costPrice, 0);
        res.json({ success: true, data, summary: { totalQty, totalValue } });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/stock-card
router.get('/stock-card', auth_js_1.authenticate, rbac_js_1.requireViewer, async (req, res, next) => {
    try {
        const { productId, dateFrom, dateTo } = req.query;
        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' });
        }
        const product = await database_js_1.prisma.product.findUnique({
            where: { id: productId },
            include: { unit: true, category: true },
        });
        const movements = await database_js_1.prisma.stockMovement.findMany({
            where: {
                productId,
                ...(dateFrom || dateTo ? {
                    createdAt: {
                        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                        ...(dateTo ? { lte: new Date(dateTo) } : {}),
                    },
                } : {}),
            },
            orderBy: { createdAt: 'asc' },
        });
        const opening = movements.length > 0 ? movements[0].qtyBefore : 0;
        res.json({ success: true, data: { product, movements, opening } });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/movement-ledger
router.get('/movement-ledger', auth_js_1.authenticate, rbac_js_1.requireViewer, async (req, res, next) => {
    try {
        const { dateFrom, dateTo, productId, type, page = 1, limit = 100 } = req.query;
        const where = {};
        if (productId)
            where.productId = productId;
        if (type)
            where.type = type;
        if (dateFrom || dateTo) {
            where.createdAt = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
            };
        }
        const [movements, total] = await Promise.all([
            database_js_1.prisma.stockMovement.findMany({
                where,
                include: { product: { select: { sku: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                skip: ((page - 1) * limit),
                take: limit,
            }),
            database_js_1.prisma.stockMovement.count({ where }),
        ]);
        res.json({ success: true, data: movements, pagination: { page, limit, total } });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/aging-stock
router.get('/aging-stock', auth_js_1.authenticate, rbac_js_1.requireViewer, async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const stocks = await database_js_1.prisma.stock.findMany({
            include: {
                product: { include: { unit: true } },
                bin: { include: { rack: { include: { zone: true } } } },
            },
        });
        const data = await Promise.all(stocks.map(async (s) => {
            const lastMovement = await database_js_1.prisma.stockMovement.findFirst({
                where: { productId: s.productId },
                orderBy: { createdAt: 'desc' },
            });
            const ageDays = lastMovement
                ? Math.floor((Date.now() - lastMovement.createdAt.getTime()) / (1000 * 60 * 60 * 24))
                : 999;
            return {
                productId: s.product.id,
                sku: s.product.sku,
                name: s.product.name,
                bin: s.bin.code,
                zone: s.bin.rack.zone.name,
                qty: Number(s.qty),
                unit: s.product.unit.name,
                costPrice: Number(s.product.costPrice),
                value: Number(s.qty) * Number(s.product.costPrice),
                lastMovement: lastMovement?.createdAt,
                ageDays,
                stale: ageDays > days,
            };
        }));
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/reorder-list
router.get('/reorder-list', auth_js_1.authenticate, rbac_js_1.requireViewer, async (_req, res, next) => {
    try {
        const products = await database_js_1.prisma.product.findMany({
            where: { isActive: true, reorderPoint: { gt: 0 } },
            include: {
                category: true,
                unit: true,
                stocks: true,
                supplier: true,
            },
        });
        const data = products.map(p => {
            const totalQty = p.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
            return {
                productId: p.id,
                sku: p.sku,
                name: p.name,
                category: p.category.name,
                unit: p.unit.name,
                currentQty: totalQty,
                minStock: p.minStock,
                reorderPoint: p.reorderPoint,
                shortage: Math.max(0, p.reorderPoint - totalQty),
                supplier: p.supplier?.name || 'N/A',
                shouldReorder: totalQty <= p.reorderPoint,
            };
        }).filter((d) => d.shouldReorder);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/valuation
router.get('/valuation', auth_js_1.authenticate, rbac_js_1.requireViewer, async (_req, res, next) => {
    try {
        const products = await database_js_1.prisma.product.findMany({
            where: { isActive: true },
            include: {
                category: true,
                unit: true,
                stocks: true,
            },
        });
        const data = products.map(p => {
            const totalQty = p.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
            const totalValue = totalQty * Number(p.costPrice);
            return {
                productId: p.id,
                sku: p.sku,
                name: p.name,
                category: p.category.name,
                unit: p.unit.name,
                totalQty,
                unitCost: Number(p.costPrice),
                totalValue,
            };
        }).sort((a, b) => b.totalValue - a.totalValue);
        const grandTotal = data.reduce((sum, d) => sum + d.totalValue, 0);
        const dataWithPercent = data.map(d => ({
            ...d,
            percentOfTotal: grandTotal > 0 ? (d.totalValue / grandTotal) * 100 : 0,
        }));
        res.json({ success: true, data: dataWithPercent, summary: { grandTotal } });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/abc-analysis
router.get('/abc-analysis', auth_js_1.authenticate, rbac_js_1.requireViewer, async (_req, res, next) => {
    try {
        // ABC based on movement value (last 30 days)
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const movements = await database_js_1.prisma.stockMovement.findMany({
            where: { createdAt: { gte: cutoff } },
            include: { product: { include: { category: true } } },
        });
        const productValue = {};
        for (const m of movements) {
            const value = Number(m.qty) * Number(m.product.costPrice);
            productValue[m.productId] = (productValue[m.productId] || 0) + value;
        }
        const total = Object.values(productValue).reduce((sum, v) => sum + v, 0);
        const sorted = Object.entries(productValue)
            .map(([productId, value]) => ({ productId, value, percent: total > 0 ? (value / total) * 100 : 0 }))
            .sort((a, b) => b.value - a.value);
        let cumulative = 0;
        const data = sorted.map((item, index) => {
            cumulative += item.percent;
            let classification = 'C';
            if (cumulative <= 80)
                classification = 'A';
            else if (cumulative <= 95)
                classification = 'B';
            const product = movements.find(m => m.productId === item.productId)?.product;
            return {
                productId: item.productId,
                sku: product?.sku || '',
                name: product?.name || '',
                category: product?.category.name || '',
                movementValue: item.value,
                percent: item.percent,
                cumulativePercent: cumulative,
                classification,
            };
        });
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/reports/supplier-performance
router.get('/supplier-performance', auth_js_1.authenticate, rbac_js_1.requireViewer, async (req, res, next) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const where = {};
        if (dateFrom || dateTo) {
            where.orderDate = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
            };
        }
        const orders = await database_js_1.prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: true,
                items: true,
                receipts: { include: { items: true } },
            },
        });
        const supplierStats = {};
        for (const po of orders) {
            if (!supplierStats[po.supplierId]) {
                supplierStats[po.supplierId] = {
                    supplierId: po.supplierId,
                    name: po.supplier.name,
                    totalPO: 0,
                    onTime: 0,
                    totalValue: 0,
                    receivedValue: 0,
                };
            }
            const stats = supplierStats[po.supplierId];
            stats.totalPO++;
            stats.totalValue += Number(po.totalAmount);
            if (po.status === 'RECEIVED' || po.status === 'PARTIAL') {
                const receivedAmount = po.receipts.reduce((sum, r) => sum + r.items.reduce((s, i) => s + Number(i.qtyReceived), 0), 0);
                stats.receivedValue += receivedAmount;
            }
            if (po.receivedDate && po.expectedDate && po.receivedDate <= po.expectedDate) {
                stats.onTime++;
            }
        }
        const data = Object.values(supplierStats).map((s) => ({
            ...s,
            fillRate: s.totalValue > 0 ? (s.receivedValue / s.totalValue) * 100 : 0,
            onTimeRate: s.totalPO > 0 ? (s.onTime / s.totalPO) * 100 : 0,
        }));
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map