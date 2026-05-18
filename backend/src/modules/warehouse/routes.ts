import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOperator } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

// ─── WAREHOUSE ────────────────────────────────────────────────────────────────

const warehouseSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

router.get('/warehouses', authenticate, async (_req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { zones: { include: { racks: { include: { bins: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: warehouses });
  } catch (err) { next(err); }
});

router.post('/warehouses', authenticate, requireOperator, validateBody(warehouseSchema), async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.create({ data: req.body });
    res.status(201).json({ success: true, data: warehouse });
  } catch (err) { next(err); }
});

router.put('/warehouses/:id', authenticate, requireOperator, validateBody(warehouseSchema.partial()), async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: warehouse });
  } catch (err) { next(err); }
});

// ─── ZONE ──────────────────────────────────────────────────────────────────────

const zoneSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  warehouseId: z.string(),
});

router.get('/zones', authenticate, async (req, res, next) => {
  try {
    const zones = await prisma.zone.findMany({
      where: req.query.warehouseId ? { warehouseId: req.query.warehouseId as string } : undefined,
      include: { warehouse: true, racks: { include: { bins: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: zones });
  } catch (err) { next(err); }
});

router.post('/zones', authenticate, requireOperator, validateBody(zoneSchema), async (req, res, next) => {
  try {
    const zone = await prisma.zone.create({ data: req.body });
    res.status(201).json({ success: true, data: zone });
  } catch (err) { next(err); }
});

// ─── RACK ─────────────────────────────────────────────────────────────────────

const rackSchema = z.object({
  code: z.string().min(1).max(20),
  zoneId: z.string(),
});

router.get('/racks', authenticate, async (req, res, next) => {
  try {
    const racks = await prisma.rack.findMany({
      where: req.query.zoneId ? { zoneId: req.query.zoneId as string } : undefined,
      include: { zone: true, bins: true },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: racks });
  } catch (err) { next(err); }
});

router.post('/racks', authenticate, requireOperator, validateBody(rackSchema), async (req, res, next) => {
  try {
    const rack = await prisma.rack.create({ data: req.body });
    res.status(201).json({ success: true, data: rack });
  } catch (err) { next(err); }
});

// ─── BIN ────────────────────────────────────────────────────────────────────────

const binSchema = z.object({
  code: z.string().min(1).max(20),
  rackId: z.string(),
});

router.get('/bins', authenticate, async (req, res, next) => {
  try {
    const bins = await prisma.bin.findMany({
      where: req.query.rackId ? { rackId: req.query.rackId as string } : undefined,
      include: { rack: { include: { zone: { include: { warehouse: true } } } } },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: bins });
  } catch (err) { next(err); }
});

router.post('/bins', authenticate, requireOperator, validateBody(binSchema), async (req, res, next) => {
  try {
    const bin = await prisma.bin.create({ data: req.body });
    res.status(201).json({ success: true, data: bin });
  } catch (err) { next(err); }
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  parentId: z.string().optional(),
});

router.get('/categories', authenticate, async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { parent: true, children: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

router.post('/categories', authenticate, requireOperator, validateBody(categorySchema), async (req, res, next) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
});

// ─── UNITS ─────────────────────────────────────────────────────────────────────

const unitSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
});

router.get('/units', authenticate, async (_req, res, next) => {
  try {
    const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: units });
  } catch (err) { next(err); }
});

router.post('/units', authenticate, requireOperator, validateBody(unitSchema), async (req, res, next) => {
  try {
    const unit = await prisma.unit.create({ data: req.body });
    res.status(201).json({ success: true, data: unit });
  } catch (err) { next(err); }
});

export default router;