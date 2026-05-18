"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_js_1 = require("../../config/database.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const validate_js_1 = require("../../middleware/validate.js");
const router = (0, express_1.Router)();
// ─── WAREHOUSE ────────────────────────────────────────────────────────────────
const warehouseSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(20),
    name: zod_1.z.string().min(2).max(100),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
});
router.get('/warehouses', auth_js_1.authenticate, async (_req, res, next) => {
    try {
        const warehouses = await database_js_1.prisma.warehouse.findMany({
            include: { zones: { include: { racks: { include: { bins: true } } } } },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: warehouses });
    }
    catch (err) {
        next(err);
    }
});
router.post('/warehouses', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(warehouseSchema), async (req, res, next) => {
    try {
        const warehouse = await database_js_1.prisma.warehouse.create({ data: req.body });
        res.status(201).json({ success: true, data: warehouse });
    }
    catch (err) {
        next(err);
    }
});
router.put('/warehouses/:id', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(warehouseSchema.partial()), async (req, res, next) => {
    try {
        const warehouse = await database_js_1.prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
        res.json({ success: true, data: warehouse });
    }
    catch (err) {
        next(err);
    }
});
// ─── ZONE ──────────────────────────────────────────────────────────────────────
const zoneSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(20),
    name: zod_1.z.string().min(1).max(100),
    warehouseId: zod_1.z.string(),
});
router.get('/zones', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const zones = await database_js_1.prisma.zone.findMany({
            where: req.query.warehouseId ? { warehouseId: req.query.warehouseId } : undefined,
            include: { warehouse: true, racks: { include: { bins: true } } },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: zones });
    }
    catch (err) {
        next(err);
    }
});
router.post('/zones', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(zoneSchema), async (req, res, next) => {
    try {
        const zone = await database_js_1.prisma.zone.create({ data: req.body });
        res.status(201).json({ success: true, data: zone });
    }
    catch (err) {
        next(err);
    }
});
// ─── RACK ─────────────────────────────────────────────────────────────────────
const rackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(20),
    zoneId: zod_1.z.string(),
});
router.get('/racks', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const racks = await database_js_1.prisma.rack.findMany({
            where: req.query.zoneId ? { zoneId: req.query.zoneId } : undefined,
            include: { zone: true, bins: true },
            orderBy: { code: 'asc' },
        });
        res.json({ success: true, data: racks });
    }
    catch (err) {
        next(err);
    }
});
router.post('/racks', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(rackSchema), async (req, res, next) => {
    try {
        const rack = await database_js_1.prisma.rack.create({ data: req.body });
        res.status(201).json({ success: true, data: rack });
    }
    catch (err) {
        next(err);
    }
});
// ─── BIN ────────────────────────────────────────────────────────────────────────
const binSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(20),
    rackId: zod_1.z.string(),
});
router.get('/bins', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const bins = await database_js_1.prisma.bin.findMany({
            where: req.query.rackId ? { rackId: req.query.rackId } : undefined,
            include: { rack: { include: { zone: { include: { warehouse: true } } } } },
            orderBy: { code: 'asc' },
        });
        res.json({ success: true, data: bins });
    }
    catch (err) {
        next(err);
    }
});
router.post('/bins', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(binSchema), async (req, res, next) => {
    try {
        const bin = await database_js_1.prisma.bin.create({ data: req.body });
        res.status(201).json({ success: true, data: bin });
    }
    catch (err) {
        next(err);
    }
});
// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const categorySchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(20),
    name: zod_1.z.string().min(1).max(100),
    parentId: zod_1.z.string().optional(),
});
router.get('/categories', auth_js_1.authenticate, async (_req, res, next) => {
    try {
        const categories = await database_js_1.prisma.category.findMany({
            include: { parent: true, children: true },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: categories });
    }
    catch (err) {
        next(err);
    }
});
router.post('/categories', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(categorySchema), async (req, res, next) => {
    try {
        const category = await database_js_1.prisma.category.create({ data: req.body });
        res.status(201).json({ success: true, data: category });
    }
    catch (err) {
        next(err);
    }
});
// ─── UNITS ─────────────────────────────────────────────────────────────────────
const unitSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).max(20),
    name: zod_1.z.string().min(1).max(50),
});
router.get('/units', auth_js_1.authenticate, async (_req, res, next) => {
    try {
        const units = await database_js_1.prisma.unit.findMany({ orderBy: { name: 'asc' } });
        res.json({ success: true, data: units });
    }
    catch (err) {
        next(err);
    }
});
router.post('/units', auth_js_1.authenticate, rbac_js_1.requireOperator, (0, validate_js_1.validateBody)(unitSchema), async (req, res, next) => {
    try {
        const unit = await database_js_1.prisma.unit.create({ data: req.body });
        res.status(201).json({ success: true, data: unit });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map