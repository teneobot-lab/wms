import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── UNITS ─────────────────────────────────────────────────────────────────
  const units = await Promise.all([
    prisma.unit.upsert({ where: { code: 'PCS' }, update: {}, create: { code: 'PCS', name: 'Pieces' } }),
    prisma.unit.upsert({ where: { code: 'KG' }, update: {}, create: { code: 'KG', name: 'Kilogram' } }),
    prisma.unit.upsert({ where: { code: 'BOX' }, update: {}, create: { code: 'BOX', name: 'Box' } }),
    prisma.unit.upsert({ where: { code: 'LTR' }, update: {}, create: { code: 'LTR', name: 'Liter' } }),
    prisma.unit.upsert({ where: { code: 'MTR' }, update: {}, create: { code: 'MTR', name: 'Meter' } }),
    prisma.unit.upsert({ where: { code: 'ROLL' }, update: {}, create: { code: 'ROLL', name: 'Roll' } }),
    prisma.unit.upsert({ where: { code: 'PAIR' }, update: {}, create: { code: 'PAIR', name: 'Pair' } }),
    prisma.unit.upsert({ where: { code: 'SET' }, update: {}, create: { code: 'SET', name: 'Set' } }),
  ]);
  console.log(`✓ ${units.length} units created`);

  // ─── CATEGORIES ───────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { code: 'ELEC' }, update: {}, create: { code: 'ELEC', name: 'Electronics' } }),
    prisma.category.upsert({ where: { code: 'TOOL' }, update: {}, create: { code: 'TOOL', name: 'Tools' } }),
    prisma.category.upsert({ where: { code: 'SAFE' }, update: {}, create: { code: 'SAFE', name: 'Safety Equipment' } }),
    prisma.category.upsert({ where: { code: 'PACK' }, update: {}, create: { code: 'PACK', name: 'Packaging' } }),
    prisma.category.upsert({ where: { code: 'OFFC' }, update: {}, create: { code: 'OFFC', name: 'Office Supplies' } }),
    prisma.category.upsert({ where: { code: 'CHEM' }, update: {}, create: { code: 'CHEM', name: 'Chemicals' } }),
  ]);
  console.log(`✓ ${categories.length} categories created`);

  // ─── WAREHOUSE ─────────────────────────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: {
      code: 'WH-001',
      name: 'Main Warehouse',
      address: '123 Industrial Zone, Jakarta',
      phone: '+62-21-555-0100',
      isActive: true,
    },
  });
  console.log(`✓ Warehouse created: ${warehouse.name}`);

  // ─── ZONES / RACKS / BINS ────────────────────────────────────────────────
  const zoneNames = ['A', 'B', 'C'];
  const zones: any[] = [];

  for (const zoneCode of zoneNames) {
    const zone = await prisma.zone.upsert({
      where: { code_warehouseId: { code: zoneCode, warehouseId: warehouse.id } },
      update: {},
      create: { code: zoneCode, name: `Zone ${zoneCode}`, warehouseId: warehouse.id },
    });
    zones.push(zone);

    // 5 racks per zone
    for (let r = 1; r <= 5; r++) {
      const rackCode = `${zoneCode}-R${r.toString().padStart(2, '0')}`;
      const rack = await prisma.rack.upsert({
        where: { code_zoneId: { code: rackCode, zoneId: zone.id } },
        update: {},
        create: { code: rackCode, zoneId: zone.id },
      });

      // 4 bins per rack
      for (let b = 1; b <= 4; b++) {
        const binCode = `${rackCode}-B${b.toString().padStart(2, '0')}`;
        await prisma.bin.upsert({
          where: { code_rackId: { code: binCode, rackId: rack.id } },
          update: {},
          create: { code: binCode, rackId: rack.id },
        });
      }
    }
  }
  console.log(`✓ ${zones.length} zones, 15 racks, 60 bins created`);

  // ─── SUPPLIERS ─────────────────────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.upsert({ where: { code: 'SUP-001' }, update: {}, create: { code: 'SUP-001', name: 'PT Maju Sentosa', contact: 'Ahmad Wijaya', phone: '+62-21-555-0201', email: 'sales@majusentosa.co.id', isActive: true } }),
    prisma.supplier.upsert({ where: { code: 'SUP-002' }, update: {}, create: { code: 'SUP-002', name: 'CV Berkah Trading', contact: 'Dewi Susanti', phone: '+62-21-555-0202', email: 'info@berkahtrading.com', isActive: true } }),
    prisma.supplier.upsert({ where: { code: 'SUP-003' }, update: {}, create: { code: 'SUP-003', name: 'Toko Sumber Rejeki', contact: 'Budi Santoso', phone: '+62-21-555-0203', email: 'budi@sumberrejeki.com', isActive: true } }),
    prisma.supplier.upsert({ where: { code: 'SUP-004' }, update: {}, create: { code: 'SUP-004', name: 'PT Indo Kabel', contact: 'Rina hartati', phone: '+62-21-555-0204', email: 'sales@indokabel.co.id', isActive: true } }),
  ]);
  console.log(`✓ ${suppliers.length} suppliers created`);

  // ─── CUSTOMERS ─────────────────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({ where: { code: 'CUST-001' }, update: {}, create: { code: 'CUST-001', name: 'PT Garuda Steel', contact: 'Hendra Prasetyo', phone: '+62-21-555-0301', email: 'procurement@garudasteel.co.id', isActive: true } }),
    prisma.customer.upsert({ where: { code: 'CUST-002' }, update: {}, create: { code: 'CUST-002', name: 'CV Maju Bersama', contact: 'Siti Nurhaliza', phone: '+62-21-555-0302', email: 'siti@majubersama.com', isActive: true } }),
    prisma.customer.upsert({ where: { code: 'CUST-003' }, update: {}, create: { code: 'CUST-003', name: 'Toko Elektrik Abadi', contact: 'Joko Widodo', phone: '+62-21-555-0303', email: 'joko@elektrikabadi.com', isActive: true } }),
  ]);
  console.log(`✓ ${customers.length} customers created`);

  // ─── PRODUCTS ──────────────────────────────────────────────────────────────
  const products = [
    { sku: 'ELEC-001', name: 'Cable Tie 150mm (100 pcs)', categoryCode: 'ELEC', unitCode: 'BOX', cost: 12500, sell: 18000, min: 50, max: 500, reorder: 100 },
    { sku: 'ELEC-002', name: 'Terminal Block 12-Pole', categoryCode: 'ELEC', unitCode: 'PCS', cost: 8500, sell: 12500, min: 20, max: 200, reorder: 50 },
    { sku: 'ELEC-003', name: 'Cable Lug 50mm (50 pcs)', categoryCode: 'ELEC', unitCode: 'BOX', cost: 35000, sell: 48000, min: 10, max: 100, reorder: 25 },
    { sku: 'TOOL-001', name: 'Adjustable Wrench 8"', categoryCode: 'TOOL', unitCode: 'PCS', cost: 45000, sell: 65000, min: 15, max: 100, reorder: 30 },
    { sku: 'TOOL-002', name: 'Screwdriver Set 12pcs', categoryCode: 'TOOL', unitCode: 'SET', cost: 55000, sell: 78000, min: 10, max: 80, reorder: 20 },
    { sku: 'TOOL-003', name: 'Measuring Tape 5m', categoryCode: 'TOOL', unitCode: 'PCS', cost: 28000, sell: 40000, min: 25, max: 200, reorder: 50 },
    { sku: 'SAFE-001', name: 'Safety Helmet (White)', categoryCode: 'SAFE', unitCode: 'PCS', cost: 35000, sell: 52000, min: 30, max: 300, reorder: 60 },
    { sku: 'SAFE-002', name: 'Safety Gloves (L)', categoryCode: 'SAFE', unitCode: 'PAIR', cost: 15000, sell: 22000, min: 50, max: 400, reorder: 100 },
    { sku: 'SAFE-003', name: 'Safety Goggles', categoryCode: 'SAFE', unitCode: 'PCS', cost: 22000, sell: 32000, min: 30, max: 200, reorder: 50 },
    { sku: 'PACK-001', name: 'Cardboard Box 40x30x20cm', categoryCode: 'PACK', unitCode: 'PCS', cost: 3500, sell: 5000, min: 200, max: 2000, reorder: 500 },
    { sku: 'PACK-002', name: 'Packing Tape 2" (6 rolls)', categoryCode: 'PACK', unitCode: 'BOX', cost: 28000, sell: 38000, min: 30, max: 300, reorder: 75 },
    { sku: 'PACK-003', name: 'Bubble Wrap 50cm x 100m', categoryCode: 'PACK', unitCode: 'ROLL', cost: 45000, sell: 62000, min: 20, max: 150, reorder: 40 },
    { sku: 'OFFC-001', name: 'A4 Paper (5 ream/box)', categoryCode: 'OFFC', unitCode: 'BOX', cost: 85000, sell: 120000, min: 20, max: 200, reorder: 50 },
    { sku: 'OFFC-002', name: 'Ballpoint Pen (12 pcs)', categoryCode: 'OFFC', unitCode: 'BOX', cost: 12000, sell: 18000, min: 50, max: 400, reorder: 100 },
    { sku: 'CHEM-001', name: 'Lubricant WD-40 400ml', categoryCode: 'CHEM', unitCode: 'PCS', cost: 38000, sell: 55000, min: 20, max: 150, reorder: 40 },
  ];

  for (const p of products) {
    const category = categories.find(c => c.code === p.categoryCode)!;
    const unit = units.find(u => u.code === p.unitCode)!;

    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: category.id,
        unitId: unit.id,
        costPrice: p.cost,
        sellPrice: p.sell,
        minStock: p.min,
        maxStock: p.max,
        reorderPoint: p.reorder,
        isActive: true,
      },
    });
  }
  console.log(`✓ ${products.length} products created`);

  // ─── USERS ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('wms2024', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@warehouse.com' },
      update: {},
      create: { name: 'Admin User', email: 'admin@warehouse.com', passwordHash, role: Role.SUPER_ADMIN, warehouseId: warehouse.id },
    }),
    prisma.user.upsert({
      where: { email: 'manager@warehouse.com' },
      update: {},
      create: { name: 'Warehouse Manager', email: 'manager@warehouse.com', passwordHash, role: Role.MANAGER, warehouseId: warehouse.id },
    }),
    prisma.user.upsert({
      where: { email: 'operator@warehouse.com' },
      update: {},
      create: { name: 'Warehouse Operator', email: 'operator@warehouse.com', passwordHash, role: Role.OPERATOR, warehouseId: warehouse.id },
    }),
  ]);
  console.log(`✓ ${users.length} users created`);

  console.log('\n✅ Database seeded successfully!');
  console.log('\nDemo accounts:');
  console.log('  admin@warehouse.com / wms2024  (Super Admin)');
  console.log('  manager@warehouse.com / wms2024  (Manager)');
  console.log('  operator@warehouse.com / wms2024  (Operator)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });