"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const database_js_1 = require("../../config/database.js");
const router = (0, express_1.Router)();
router.get('/kpis', auth_js_1.authenticate, rbac_js_1.requireViewer, async (_req, res, next) => {
    try {
        const [totalProducts, totalStockAgg, pendingPO, pendingSO, recentMovements] = await Promise.all([
            database_js_1.prisma.product.count({ where: { isActive: true } }),
            database_js_1.prisma.stock.aggregate({ _sum: { qty: true }, _count: { productId: true } }),
            database_js_1.prisma.purchaseOrder.count({ where: { status: { in: ['SUBMITTED', 'APPROVED', 'PARTIAL'] } } }),
            database_js_1.prisma.salesOrder.count({ where: { status: { in: ['CONFIRMED', 'PICKING', 'PACKED'] } } }),
            database_js_1.prisma.stockMovement.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { product: { select: { sku: true, name: true } } },
            }),
        ]);
        // Low stock count: products below reorder point
        const lowStockCount = await database_js_1.prisma.product.count({
            where: {
                isActive: true,
                reorderPoint: { gt: 0 },
            },
        });
        res.json({
            success: true,
            data: {
                kpis: {
                    totalProducts,
                    totalStockLocations: totalStockAgg._count.productId || 0,
                    lowStockCount,
                    pendingPO,
                    pendingSO,
                },
                recentMovements,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/low-stock', auth_js_1.authenticate, rbac_js_1.requireViewer, async (_req, res, next) => {
    try {
        const products = await database_js_1.prisma.product.findMany({
            where: { isActive: true, reorderPoint: { gt: 0 } },
            include: {
                category: true,
                unit: true,
                stocks: { select: { qty: true } },
            },
            orderBy: { name: 'asc' },
        });
        const data = products.map(p => {
            const totalQty = p.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
            return { ...p, totalQty, stocks: undefined };
        }).filter(p => p.totalQty <= p.reorderPoint);
        res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
router.get('/movements-chart', auth_js_1.authenticate, rbac_js_1.requireViewer, async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const movements = await database_js_1.prisma.stockMovement.findMany({
            where: { createdAt: { gte: startDate } },
            select: { type: true, qty: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        const chartData = {};
        for (const m of movements) {
            const day = m.createdAt.toISOString().split('T')[0];
            if (!chartData[day])
                chartData[day] = {};
            if (!chartData[day][m.type])
                chartData[day][m.type] = 0;
            chartData[day][m.type] += Number(m.qty);
        }
        const series = Object.entries(chartData).map(([date, types]) => ({
            date,
            ...types,
        }));
        res.json({ success: true, data: series });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map