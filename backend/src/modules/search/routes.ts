import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// GET /api/search/products?q=
router.get('/products', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const products = await prisma.product.findMany({
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
      };
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/search/suppliers?q=
router.get('/suppliers', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const suppliers = await prisma.supplier.findMany({
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

    res.json({ success: true, data: suppliers.map(s => ({ id: s.id, code: s.code, name: s.name, phone: s.phone, email: s.email })) });
  } catch (err) { next(err); }
});

// GET /api/search/customers?q=
router.get('/customers', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const customers = await prisma.customer.findMany({
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

    res.json({ success: true, data: customers.map(c => ({ id: c.id, code: c.code, name: c.name, phone: c.phone, email: c.email })) });
  } catch (err) { next(err); }
});

// GET /api/search/bins?q=
router.get('/bins', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const bins = await prisma.bin.findMany({
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
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/search/categories?q=
router.get('/categories', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
          ],
        }
      : {};

    const categories = await prisma.category.findMany({
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
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/search/units?q=
router.get('/units', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
          ],
        }
      : {};

    const units = await prisma.unit.findMany({
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
      })),
    });
  } catch (err) { next(err); }
});

export default router;