import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOperator } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const createSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 50 } = req.query as any;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: ((page - 1) * limit) as number,
        take: limit as number,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, data: customers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw new AppError(404, 'Customer not found.', 'NOT_FOUND');
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireOperator, validateBody(createSchema), async (req, res, next) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json({ success: true, data: customer });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireOperator, validateBody(createSchema.partial()), async (req, res, next) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireOperator, async (req, res, next) => {
  try {
    await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Customer deactivated.' });
  } catch (err) { next(err); }
});

export default router;