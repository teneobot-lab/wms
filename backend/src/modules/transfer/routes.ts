import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOperator } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

router.post(
  '/',
  authenticate,
  requireOperator,
  validateBody(
    z.object({
      fromBinId: z.string(),
      toBinId: z.string(),
      items: z.array(z.object({
        productId: z.string(),
        qty: z.number().min(0.001),
        batchNo: z.string().optional(),
      })).min(1),
      notes: z.string().optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const { fromBinId, toBinId, items, notes } = req.body;

      if (fromBinId === toBinId) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TRANSFER',
          message: 'Source and destination bin cannot be the same.',
        });
      }

      const result = await prisma.$transaction(async (tx) => {
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
              createdBy: req.user!.userId,
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
          } else {
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
    } catch (err) {
      next(err);
    }
  }
);


// GET / — list all transfers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { type: 'TRANSFER' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
        },
      }),
      prisma.stockMovement.count({ where: { type: 'TRANSFER' } }),
    ]);

    res.json({
      success: true,
      data: transfers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
