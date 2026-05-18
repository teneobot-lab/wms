import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOperator } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';

const router = Router();

// ─── SCHEMAS ───────────────────────────────────────────────────────────────────

const createProductSchema = z.object({
  sku: z.string().min(2).max(50),
  barcode: z.string().optional(),
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  categoryId: z.string(),
  unitId: z.string(),
  costPrice: z.number().min(0).default(0),
  sellPrice: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateProductSchema = createProductSchema.partial();

// ─── GET /api/products ─────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  validateQuery(
    z.object({
      search: z.string().optional(),
      categoryId: z.string().optional(),
      isActive: z.string().optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(50),
      sortBy: z.string().default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    })
  ),
  async (req, res, next) => {
    try {
      const { search, categoryId, isActive, page, limit, sortBy, sortOrder } = req.query as any;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (categoryId) where.categoryId = categoryId;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            unit: true,
            stocks: { select: { qty: true } },
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.product.count({ where }),
      ]);

      const data = products.map((p) => {
        const totalQty = p.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
        return {
          ...p,
          totalQty,
          stocks: undefined,
        };
      });

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/products/:id ─────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        unit: true,
        stocks: { include: { bin: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } } } },
      },
    });

    if (!product) {
      throw new AppError(404, 'Product not found.', 'NOT_FOUND');
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/products/:id/stock ───────────────────────────────────────────────

router.get('/:id/stock', authenticate, async (req, res, next) => {
  try {
    const stocks = await prisma.stock.findMany({
      where: { productId: req.params.id },
      include: {
        bin: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const data = stocks.map((s) => ({
      id: s.id,
      binId: s.binId,
      binCode: s.bin.code,
      rackCode: s.bin.rack.code,
      zoneName: s.bin.rack.zone.name,
      warehouseName: s.bin.rack.zone.warehouse.name,
      qty: Number(s.qty),
      reservedQty: Number(s.reservedQty),
      available: Number(s.qty) - Number(s.reservedQty),
      batchNo: s.batchNo,
      expiryDate: s.expiryDate,
      updatedAt: s.updatedAt,
    }));

    const totalQty = data.reduce((sum, s) => sum + s.qty, 0);
    const totalReserved = data.reduce((sum, s) => sum + s.reservedQty, 0);

    res.json({ success: true, data: { stocks: data, summary: { totalQty, totalReserved, available: totalQty - totalReserved } } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/products/:id/movements ───────────────────────────────────────────

router.get('/:id/movements', authenticate, async (req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: movements });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/products ───────────────────────────────────────────────────────

router.post('/', authenticate, requireOperator, validateBody(createProductSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const product = await prisma.product.create({
      data: {
        ...data,
        costPrice: data.costPrice || 0,
        sellPrice: data.sellPrice || 0,
      },
      include: { category: true, unit: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'Product',
        entityId: product.id,
        newValues: product,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────

router.put('/:id', authenticate, requireOperator, validateBody(updateProductSchema), async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Product not found.', 'NOT_FOUND');

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
      include: { category: true, unit: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'Product',
        entityId: product.id,
        oldValues: existing,
        newValues: product,
      },
    });

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────

router.delete('/:id', authenticate, requireOperator, async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entity: 'Product',
        entityId: product.id,
      },
    });

    res.json({ success: true, message: 'Product deactivated.' });
  } catch (err) {
    next(err);
  }
});

export default router;