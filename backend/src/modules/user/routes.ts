import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOperator } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import bcrypt from 'bcryptjs';

const router = Router();

// ─── USER SCHEMAS ──────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']),
  warehouseId: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true });
const resetPasswordSchema = z.object({
  password: z.string().min(6).max(100),
});

// ─── GET /api/users ────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, role, isActive, page = 1, limit = 50 } = req.query as any;
    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          warehouseId: true,
          warehouse: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
        skip: ((page - 1) * limit) as number,
        take: limit as number,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/users/:id ────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        warehouseId: true,
        warehouse: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found.', 'NOT_FOUND');
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/users ───────────────────────────────────────────────────────────

router.post('/', authenticate, requireOperator, validateBody(createUserSchema), async (req, res, next) => {
  try {
    const { password, ...data } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(400, 'Email already in use.', 'DUPLICATE_EMAIL');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        warehouseId: true,
        warehouse: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        newValues: user,
      },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/:id ────────────────────────────────────────────────────────

router.put('/:id', authenticate, requireOperator, validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError(404, 'User not found.', 'NOT_FOUND');
    }

    // Check if trying to update own account's role to something lower
    if (req.user!.userId === req.params.id && req.body.role && req.body.role !== existing.role) {
      const currentRole = existing.role;
      const newRole = req.body.role;
      const roleHierarchy = ['VIEWER', 'OPERATOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];
      const currentIndex = roleHierarchy.indexOf(currentRole);
      const newIndex = roleHierarchy.indexOf(newRole);

      if (newIndex > currentIndex) {
        throw new AppError(400, 'Tidak dapat mengubah role sendiri ke level yang lebih tinggi.', 'INVALID_ROLE_CHANGE');
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        warehouseId: true,
        warehouse: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        oldValues: existing,
        newValues: user,
      },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/users/:id ─────────────────────────────────────────────────────

router.delete('/:id', authenticate, requireOperator, async (req, res, next) => {
  try {
    // Cannot delete yourself
    if (req.user!.userId === req.params.id) {
      throw new AppError(400, 'Tidak dapat menghapus akun sendiri.', 'CANNOT_DELETE_SELF');
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw new AppError(404, 'User not found.', 'NOT_FOUND');
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entity: 'User',
        entityId: req.params.id,
      },
    });

    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/users/:id/reset-password ───────────────────────────────────────

router.post('/:id/reset-password', authenticate, requireOperator, validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw new AppError(404, 'User not found.', 'NOT_FOUND');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: req.params.id,
        notes: 'Password reset by admin',
      },
    });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;