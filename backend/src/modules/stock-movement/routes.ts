import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireViewer } from '../../middleware/rbac.js';
import { validateQuery } from '../../middleware/validate.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireViewer,
  validateQuery(
    z.object({
      productId: z.string().optional(),
      type: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(50),
    })
  ),
  async (req, res, next) => {
    try {
      const { productId, type, dateFrom, dateTo, page, limit } = req.query as any;
      const where: any = {};
      if (productId) where.productId = productId;
      if (type) where.type = type;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: { select: { sku: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: ((page - 1) * limit) as number,
          take: limit as number,
        }),
        prisma.stockMovement.count({ where }),
      ]);

      res.json({
        success: true,
        data: movements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) { next(err); }
  }
);

export default router;