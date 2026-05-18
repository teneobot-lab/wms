import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOperator } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query as any;
    const where: any = {};
    if (status) where.status = status;

    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          items: true,
          createdByUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: ((page - 1) * limit) as number,
        take: limit as number,
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    res.json({ success: true, data: adjustments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const adj = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        createdByUser: { select: { name: true } },
      },
    });
    if (!adj) throw new AppError(404, 'Adjustment not found.', 'NOT_FOUND');
    res.json({ success: true, data: adj });
  } catch (err) { next(err); }
});

router.post(
  '/',
  authenticate,
  requireOperator,
  validateBody(
    z.object({
      reason: z.string().min(1),
      notes: z.string().optional(),
      status: z.enum(['DRAFT', 'SUBMITTED']).optional().default('SUBMITTED'),
      items: z.array(z.object({
        productId: z.string(),
        binId: z.string(),
        qtySystem: z.number().min(0).optional(),
        actualStock: z.number().min(0),
        systemStock: z.number().min(0).optional(),
        notes: z.string().optional(),
      })).min(1),
    })
  ),
  async (req, res, next) => {
    try {
      const { reason, notes, status = 'SUBMITTED', items } = req.body;
      const adjNo = `ADJ-${Date.now()}`;

      const adjustment = await prisma.$transaction(async (tx) => {
        const adj = await tx.stockAdjustment.create({
          data: {
            adjNo,
            reason,
            notes,
            status,
            createdBy: req.user!.userId,
            items: {
              create: items.map((item: any) => {
                const qtySystem = item.qtySystem ?? item.systemStock ?? 0;
                const qtyActual = item.actualStock;
                return {
                  productId: item.productId,
                  binId: item.binId,
                  qtySystem,
                  qtyActual,
                  difference: qtyActual - qtySystem,
                  notes: item.notes,
                };
              }),
            },
          },
          include: { items: true },
        });
        return adj;
      });

      res.status(201).json({ success: true, data: adjustment });
    } catch (err) { next(err); }
  }
);

router.post('/:id/submit', authenticate, requireOperator, async (req, res, next) => {
  try {
    const adj = await prisma.stockAdjustment.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED' },
    });
    res.json({ success: true, data: adj });
  } catch (err) { next(err); }
});

router.post('/:id/approve', authenticate, requireOperator, async (req, res, next) => {
  try {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!adjustment) throw new AppError(404, 'Adjustment not found.', 'NOT_FOUND');
    if (adjustment.status !== 'SUBMITTED') {
      throw new AppError(400, 'Only submitted adjustments can be approved.', 'INVALID_STATUS');
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of adjustment.items) {
        const stock = await tx.stock.findFirst({
          where: { productId: item.productId, binId: item.binId },
        });

        if (stock) {
          const qtyBefore = Number(stock.qty);
          const qtyAfter = Number(item.qtyActual);
          const diff = Number(item.difference);

          await tx.stock.update({
            where: { id: stock.id },
            data: { qty: item.qtyActual },
          });

          await tx.stockMovement.create({
            data: {
              refNo: `ADJ-${adjustment.id}`,
              productId: item.productId,
              type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
              qty: Math.abs(diff),
              qtyBefore,
              qtyAfter,
              fromBinId: diff < 0 ? item.binId : undefined,
              toBinId: diff >= 0 ? item.binId : undefined,
              adjustmentId: adjustment.id,
              createdBy: req.user!.userId,
              notes: `Adjustment: ${adjustment.reason}`,
            },
          });
        }
      }

      const updated = await tx.stockAdjustment.update({
        where: { id: adjustment.id },
        data: { status: 'APPROVED', approvedBy: req.user!.userId },
      });

      return updated;
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/:id/reject', authenticate, requireOperator, async (req, res, next) => {
  try {
    const adj = await prisma.stockAdjustment.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    res.json({ success: true, data: adj });
  } catch (err) { next(err); }
});

export default router;