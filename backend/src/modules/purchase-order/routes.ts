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

const createPOSchema = z.object({
  supplierId: z.string(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(createItemSchema).min(1),
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, supplierId, page = 1, limit = 50 } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: { include: { product: true } },
          createdByUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: ((page - 1) * limit) as number,
        take: limit as number,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        receipts: { include: { items: true } },
        createdByUser: { select: { name: true } },
      },
    });
    if (!po) throw new AppError(404, 'Purchase order not found.', 'NOT_FOUND');
    res.json({ success: true, data: po });
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireOperator, validateBody(createPOSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const poNo = `PO-${Date.now()}`;

    const totalAmount = data.items.reduce(
      (sum: number, item: any) => sum + item.qtyOrdered * item.unitPrice,
      0
    );

    const po = await prisma.purchaseOrder.create({
      data: {
        poNo,
        supplierId: data.supplierId,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
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
        supplier: true,
        items: { include: { product: true } },
      },
    });

    res.status(201).json({ success: true, data: po });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireOperator, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw new AppError(404, 'PO not found.', 'NOT_FOUND');
    if (!['DRAFT', 'SUBMITTED'].includes(po.status)) {
      throw new AppError(400, 'Cannot update PO in current status.', 'INVALID_STATUS');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: req.body,
      include: { supplier: true, items: { include: { product: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.post('/:id/submit', authenticate, requireOperator, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED' },
    });
    res.json({ success: true, data: po });
  } catch (err) { next(err); }
});

router.post('/:id/approve', authenticate, requireOperator, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw new AppError(404, 'PO not found.', 'NOT_FOUND');
    if (po.status !== 'SUBMITTED') {
      throw new AppError(400, 'Hanya PO dengan status SUBMITTED yang dapat disetujui.', 'INVALID_STATUS');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.post('/:id/cancel', authenticate, requireOperator, async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw new AppError(404, 'PO not found.', 'NOT_FOUND');
    if (['RECEIVED', 'CANCELLED'].includes(po.status)) {
      throw new AppError(400, 'PO tidak dapat dibatalkan.', 'INVALID_STATUS');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.post('/:id/receive', authenticate, requireOperator, validateBody(z.object({
  receiptDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    poItemId: z.string(),
    productId: z.string(),
    qtyReceived: z.number().min(0.001),
    binId: z.string(),
    batchNo: z.string().optional(),
    expiryDate: z.string().optional(),
  })).min(1),
})), async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!po) throw new AppError(404, 'PO not found.', 'NOT_FOUND');
    if (!['APPROVED', 'PARTIAL'].includes(po.status)) {
      throw new AppError(400, 'PO must be approved before receiving.', 'INVALID_STATUS');
    }

    const { items, receiptDate, notes } = req.body;
    const grNo = `GR-${Date.now()}`;

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Goods Receipt
      const gr = await tx.goodsReceipt.create({
        data: {
          grNo,
          poId: po.id,
          receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
          notes,
          createdBy: req.user!.userId,
          items: {
            create: items.map((item: any) => ({
              poItemId: item.poItemId,
              productId: item.productId,
              qtyReceived: item.qtyReceived,
              binId: item.binId,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            })),
          },
        },
        include: { items: true },
      });

      // Update stock and create movements
      for (const item of items) {
        const poItem = po.items.find(i => i.id === item.poItemId);
        if (!poItem) continue;

        // Upsert stock
        const existing = await tx.stock.findFirst({
          where: { productId: item.productId, binId: item.binId, batchNo: item.batchNo || null },
        });

        let qtyBefore = 0;
        if (existing) {
          qtyBefore = Number(existing.qty);
          await tx.stock.update({
            where: { id: existing.id },
            data: { qty: { increment: item.qtyReceived } },
          });
        } else {
          await tx.stock.create({
            data: {
              productId: item.productId,
              binId: item.binId,
              qty: item.qtyReceived,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            },
          });
        }

        // Create movement
        await tx.stockMovement.create({
          data: {
            refNo: `GR-${gr.id}`,
            productId: item.productId,
            type: 'RECEIPT',
            qty: item.qtyReceived,
            qtyBefore,
            qtyAfter: qtyBefore + item.qtyReceived,
            toBinId: item.binId,
            poItemId: item.poItemId,
            createdBy: req.user!.userId,
          },
        });

        // Update PO item qtyReceived
        await tx.purchaseOrderItem.update({
          where: { id: item.poItemId },
          data: { qtyReceived: { increment: item.qtyReceived } },
        });
      }

      // Check if all items fully received
      const allItems = await tx.purchaseOrderItem.findMany({ where: { poId: po.id } });
      const allReceived = allItems.every(item => Number(item.qtyReceived) >= Number(item.qtyOrdered));

      // Update PO status
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: allReceived ? 'RECEIVED' : 'PARTIAL',
          receivedDate: allReceived ? new Date() : undefined,
        },
      });

      return gr;
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;