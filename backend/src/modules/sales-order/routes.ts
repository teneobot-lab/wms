import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOperator } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const createItemSchema = z.object({
  productId: z.string(),
  qtyOrdered: z.number().min(0.001),
  unitPrice: z.number().min(0),
  notes: z.string().optional(),
});

const createSOSchema = z.object({
  customerId: z.string(),
  requiredDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(createItemSchema).min(1),
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, customerId, page = 1, limit = 50 } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: true } },
          createdByUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: ((page - 1) * limit) as number,
        take: limit as number,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    res.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const so = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        pickings: { include: { items: true } },
        createdByUser: { select: { name: true } },
      },
    });
    if (!so) throw new AppError(404, 'Sales order not found.', 'NOT_FOUND');
    res.json({ success: true, data: so });
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireOperator, validateBody(createSOSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const soNo = `SO-${Date.now()}`;

    const totalAmount = data.items.reduce(
      (sum: number, item: any) => sum + item.qtyOrdered * item.unitPrice,
      0
    );

    const so = await prisma.salesOrder.create({
      data: {
        soNo,
        customerId: data.customerId,
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : undefined,
        notes: data.notes,
        totalAmount,
        createdBy: req.user!.userId,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            qtyOrdered: item.qtyOrdered,
            unitPrice: item.unitPrice,
            totalPrice: item.qtyOrdered * item.unitPrice,
            notes: item.notes,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    res.status(201).json({ success: true, data: so });
  } catch (err) { next(err); }
});

router.post('/:id/confirm', authenticate, requireOperator, async (req, res, next) => {
  try {
    // Validate stock availability
    const so = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: { include: { stocks: true } } } } },
    });
    if (!so) throw new AppError(404, 'SO not found.', 'NOT_FOUND');

    for (const item of so.items) {
      const totalStock = item.product.stocks.reduce((sum, s) => sum + Number(s.qty), 0);
      if (totalStock < Number(item.qtyOrdered)) {
        throw new AppError(400, `Insufficient stock for ${item.product.name}. Available: ${totalStock}`, 'INSUFFICIENT_STOCK');
      }
    }

    const updated = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED' },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.post('/:id/picking', authenticate, requireOperator, async (req, res, next) => {
  try {
    const so = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!so) throw new AppError(404, 'SO not found.', 'NOT_FOUND');
    if (!['CONFIRMED', 'PICKING'].includes(so.status)) {
      throw new AppError(400, 'SO must be confirmed before picking.', 'INVALID_STATUS');
    }

    const pickNo = `PICK-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create picking order
      const picking = await tx.pickingOrder.create({
        data: {
          pickNo,
          soId: so.id,
          status: 'PENDING',
          createdBy: req.user!.userId,
        },
      });

      // Create picking items (find stock locations)
      for (const soItem of so.items) {
        // Find bins with stock
        const stocks = await tx.stock.findMany({
          where: {
            productId: soItem.productId,
            qty: { gt: 0 },
          },
          include: { bin: true },
          orderBy: { qty: 'desc' },
        });

        let remaining = Number(soItem.qtyOrdered);
        for (const stock of stocks) {
          if (remaining <= 0) break;
          const pickQty = Math.min(remaining, Number(stock.qty));
          await tx.pickingItem.create({
            data: {
              pickId: picking.id,
              soItemId: soItem.id,
              productId: soItem.productId,
              binId: stock.binId,
              qtyRequired: pickQty,
            },
          });
          remaining -= pickQty;
        }
      }

      // Update SO status
      await tx.salesOrder.update({
        where: { id: so.id },
        data: { status: 'PICKING' },
      });

      return picking;
    });

    const pickingWithItems = await prisma.pickingOrder.findUnique({
      where: { id: result.id },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: pickingWithItems });
  } catch (err) { next(err); }
});

router.post('/:id/complete-pick', authenticate, requireOperator, validateBody(z.object({
  pickingId: z.string(),
  items: z.array(z.object({
    pickItemId: z.string(),
    qtyPicked: z.number().min(0),
  })),
})), async (req, res, next) => {
  try {
    const { pickingId, items } = req.body;
    const so = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { pickings: { include: { items: true } } },
    });
    if (!so) throw new AppError(404, 'SO not found.', 'NOT_FOUND');

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const pickItem = await tx.pickingItem.findUnique({ where: { id: item.pickItemId } });
        if (!pickItem || !item.qtyPicked) continue;

        // Get current stock
        const stock = await tx.stock.findFirst({
          where: { productId: pickItem.productId, binId: pickItem.binId },
        });

        if (stock) {
          // Deduct stock
          await tx.stock.update({
            where: { id: stock.id },
            data: { qty: { decrement: item.qtyPicked } },
          });

          // Get updated qty
          const updatedStock = await tx.stock.findUnique({ where: { id: stock.id } });

          // Create movement
          await tx.stockMovement.create({
            data: {
              refNo: `SO-${so.id}`,
              productId: pickItem.productId,
              type: 'ISSUE',
              qty: item.qtyPicked,
              qtyBefore: Number(stock.qty),
              qtyAfter: Number(updatedStock?.qty || 0),
              fromBinId: pickItem.binId,
              soItemId: pickItem.soItemId,
              createdBy: req.user!.userId,
              notes: `SO: ${so.soNo}`,
            },
          });
        }

        // Update picking item
        await tx.pickingItem.update({
          where: { id: item.pickItemId },
          data: { qtyPicked: item.qtyPicked, isDone: item.qtyPicked >= Number(pickItem.qtyRequired) },
        });

        // Update SO item qtyPicked
        await tx.salesOrderItem.update({
          where: { id: pickItem.soItemId },
          data: { qtyPicked: { increment: item.qtyPicked } },
        });
      }

      // Check if all pickings done
      const picking = await tx.pickingOrder.findUnique({
        where: { id: pickingId },
        include: { items: true },
      });

      const allDone = picking?.items.every(i => i.isDone);

      if (allDone) {
        await tx.pickingOrder.update({ where: { id: pickingId }, data: { status: 'DONE' } });
        await tx.salesOrder.update({
          where: { id: so.id },
          data: { status: 'PACKED' },
        });
      }
    });

    res.json({ success: true, message: 'Pick completed.' });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireOperator, async (req, res, next) => {
  try {
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!so) throw new AppError(404, 'SO not found.', 'NOT_FOUND');
    if (!['DRAFT'].includes(so.status)) {
      throw new AppError(400, 'Cannot update SO in current status.', 'INVALID_STATUS');
    }

    const updated = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.post('/:id/ship', authenticate, requireOperator, async (req, res, next) => {
  try {
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!so) throw new AppError(404, 'SO not found.', 'NOT_FOUND');
    if (!['CONFIRMED', 'PICKING', 'PACKED'].includes(so.status)) {
      throw new AppError(400, 'SO tidak dapat dikirim.', 'INVALID_STATUS');
    }

    const updated = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: { status: 'SHIPPED', shippedDate: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.post('/:id/cancel', authenticate, requireOperator, async (req, res, next) => {
  try {
    const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id } });
    if (!so) throw new AppError(404, 'SO not found.', 'NOT_FOUND');
    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(so.status)) {
      throw new AppError(400, 'SO tidak dapat dibatalkan.', 'INVALID_STATUS');
    }

    const updated = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;