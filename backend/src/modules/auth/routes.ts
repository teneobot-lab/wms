import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateBody } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/auth.js';
import type { JwtPayload } from '../../middleware/auth.js';

const router = Router();

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
}

function generateRefNo(prefix: string, id: string) {
  return `${prefix}-${Date.now()}-${id.slice(-4).toUpperCase()}`;
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────────

router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { warehouse: true },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    const payload: JwtPayload = { userId: user.id, role: user.role };
    const { accessToken, refreshToken } = generateTokens(payload);

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'Session',
        entityId: user.id,
        ip: req.ip,
      },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          warehouse: user.warehouse,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.substring(7);

    await prisma.session.deleteMany({
      where: { token },
    });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required.', 'TOKEN_REQUIRED');
    }

    // Verify refresh token
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token.', 'INVALID_TOKEN');
    }

    // Check session
    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { warehouse: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError(401, 'Session expired.', 'SESSION_EXPIRED');
    }

    // Generate new tokens
    const newPayload: JwtPayload = { userId: session.user.id, role: session.user.role };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(newPayload);

    // Rotate refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { token: newRefreshToken },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          warehouse: session.user.warehouse,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { warehouse: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found.', 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        warehouse: user.warehouse,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;