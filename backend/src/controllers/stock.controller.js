const { prisma } = require('../lib/prisma');

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

async function getInstallCount(tx, stockTireId) {
  return tx.tire_lifecycle_events.count({
    where: {
      stockTireId,
      event: { in: ['INSTALL', 'REINSTALL'] },
    },
  });
}

async function addLifecycleEvent(tx, stockTireId, event, fromStatus, toStatus, notes, performedBy) {
  await tx.tire_lifecycle_events.create({
    data: {
      stockTireId,
      event,
      fromStatus,
      toStatus,
      notes: notes || null,
      performedBy: performedBy || 'sistema',
    },
  });
}

// ─── GET /api/stock ──────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { lifecycle, size } = req.query;

    const tires = await prisma.stock_tires.findMany({
      where: {
        ...(lifecycle ? { lifecycle } : {}),
        ...(size ? { size: { contains: size, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ lifecycle: 'asc' }, { code: 'asc' }],
    });

    const summary = {
      total: tires.length,
      newAvailable: tires.filter((t) => t.lifecycle === 'NEW_AVAILABLE').length,
      installed: tires.filter((t) => t.lifecycle === 'INSTALLED').length,
      withdrawn: tires.filter((t) => t.lifecycle === 'WITHDRAWN').length,
      inRepair: tires.filter((t) => t.lifecycle === 'IN_REPAIR').length,
      repairedAvailable: tires.filter((t) => t.lifecycle === 'REPAIRED_AVAILABLE').length,
      scrapped: tires.filter((t) => t.lifecycle === 'SCRAPPED').length,
      availableTotal: tires.filter((t) =>
        ['NEW_AVAILABLE', 'REPAIRED_AVAILABLE'].includes(t.lifecycle)
      ).length,
    };

    res.json({ tires, summary });
  } catch (err) {
    console.error('stock getAll error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/stock/:id ──────────────────────────────────────
const getById = async (req, res) => {
  try {
    const tire = await prisma.stock_tires.findUnique({
      where: { id: req.params.id },
    });

    if (!tire) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    const events = await prisma.tire_lifecycle_events.findMany({
      where: { stockTireId: tire.id },
      orderBy: { performedAt: 'asc' },
    });

    res.json({ ...tire, events });
  } catch (err) {
    console.error('stock getById error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/stock ─────────────────────────────────────────
const create = async (req, res) => {
  try {
    const {
      code,
      brand,
      model,
      size,
      dot,
      purchasePrice,
      supplier,
      notes,
      quantity,
    } = req.body;

    if (!code || !size) {
      return res.status(400).json({ error: 'Código y medida son obligatorios' });
    }

    const qty = Math.max(parseInt(quantity || 1, 10), 1);
    const created = [];

    for (let i = 0; i < qty; i++) {
      const tireCode = qty > 1 ? `${code}-${String(i + 1).padStart(2, '0')}` : code;

      const exists = await prisma.stock_tires.findUnique({
        where: { code: tireCode },
      });

      if (exists) {
        return res.status(400).json({ error: `Código ${tireCode} ya existe` });
      }

      const tire = await prisma.$transaction(async (tx) => {
        const t = await tx.stock_tires.create({
          data: {
            code: tireCode,
            brand: brand || null,
            model: model || null,
            size,
            dot: dot || null,
            purchasePrice: parseNumber(purchasePrice),
            purchaseDate: new Date(),
            notes: notes || null,
          },
        });

        await addLifecycleEvent(
          tx,
          t.id,
          'PURCHASE',
          'NEW_AVAILABLE',
          'NEW_AVAILABLE',
          `Ingreso a bodega${supplier ? ` — Proveedor: ${supplier}` : ''}${notes ? ` — ${notes}` : ''}`,
          req.user?.email || req.user?.name || 'sistema'
        );

        return t;
      });

      created.push(tire);
    }

    res.status(201).json(qty === 1 ? created[0] : created);
  } catch (err) {
    console.error('stock create error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/stock/:id/install ─────────────────────────────
const install = async (req, res) => {
  try {
    const { equipmentId, position, salePrice, mechanicName, notes } = req.body;

    if (!equipmentId) {
      return res.status(400).json({ error: 'equipmentId es obligatorio' });
    }

    const stockTire = await prisma.stock_tires.findUnique({
      where: { id: req.params.id },
    });

    if (!stockTire) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    if (!['NEW_AVAILABLE', 'REPAIRED_AVAILABLE'].includes(stockTire.lifecycle)) {
      return res.status(400).json({
        error: `No se puede instalar — estado actual: ${stockTire.lifecycle}`,
      });
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    const installCount = await getInstallCount(prisma, stockTire.id);
    const event = installCount > 0 ? 'REINSTALL' : 'INSTALL';

    await prisma.$transaction(async (tx) => {
      const createdTire = await tx.tires.create({
        data: {
          equipmentId,
          position: position || 'Sin posición',
          brand: stockTire.brand,
          model: stockTire.model,
          size: stockTire.size,
          dot: stockTire.dot,
          purchasePrice: stockTire.purchasePrice,
          installDate: new Date(),
          status: 'OK',
          notes: `Stock: ${stockTire.code}${salePrice ? ` · Venta: ${salePrice}` : ''}${mechanicName ? ` · Mecánico: ${mechanicName}` : ''}${notes ? ` · ${notes}` : ''}`,
        },
      });

      await tx.stock_tires.update({
        where: { id: stockTire.id },
        data: {
          lifecycle: 'INSTALLED',
          currentTireId: createdTire.id,
        },
      });

      await addLifecycleEvent(
        tx,
        stockTire.id,
        event,
        stockTire.lifecycle,
        'INSTALLED',
        `Equipo: ${equipment?.name || equipmentId}${position ? ` · Posición: ${position}` : ''}${notes ? ` · ${notes}` : ''}`,
        req.user?.email || req.user?.name || 'sistema'
      );
    });

    res.json({
      message: 'Neumático instalado',
      isReinstall: installCount > 0,
    });
  } catch (err) {
    console.error('stock install error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/stock/:id/withdraw ────────────────────────────
const withdraw = async (req, res) => {
  try {
    const { equipmentName, position, notes } = req.body;

    const stockTire = await prisma.stock_tires.findUnique({
      where: { id: req.params.id },
    });

    if (!stockTire) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    if (stockTire.lifecycle !== 'INSTALLED') {
      return res.status(400).json({ error: 'El neumático no está instalado' });
    }

    const installCount = await getInstallCount(prisma, stockTire.id);

    await prisma.$transaction(async (tx) => {
      if (stockTire.currentTireId) {
        await tx.tires.update({
          where: { id: stockTire.currentTireId },
          data: {
            status: 'RETIRED',
            isActive: false,
          },
        });
      }

      await tx.stock_tires.update({
        where: { id: stockTire.id },
        data: {
          lifecycle: 'WITHDRAWN',
          currentTireId: null,
        },
      });

      await addLifecycleEvent(
        tx,
        stockTire.id,
        'WITHDRAW',
        'INSTALLED',
        'WITHDRAWN',
        `${equipmentName ? `Equipo: ${equipmentName}` : ''}${position ? ` · Posición: ${position}` : ''}${notes ? ` · ${notes}` : ''}`,
        req.user?.email || req.user?.name || 'sistema'
      );
    });

    res.json({
      message: 'Neumático retirado',
      installCount,
      canRepair: installCount < 2,
    });
  } catch (err) {
    console.error('stock withdraw error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/stock/:id/start-repair ────────────────────────
const startRepair = async (req, res) => {
  try {
    const { notes } = req.body;

    const stockTire = await prisma.stock_tires.findUnique({
      where: { id: req.params.id },
    });

    if (!stockTire) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    if (stockTire.lifecycle !== 'WITHDRAWN') {
      return res.status(400).json({ error: 'El neumático debe estar retirado para reparar' });
    }

    const installCount = await getInstallCount(prisma, stockTire.id);
    if (installCount >= 2) {
      return res.status(400).json({
        error: 'Este neumático ya fue instalado 2 veces — debe ir a desecho (REP)',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stock_tires.update({
        where: { id: stockTire.id },
        data: { lifecycle: 'IN_REPAIR' },
      });

      await addLifecycleEvent(
        tx,
        stockTire.id,
        'START_REPAIR',
        'WITHDRAWN',
        'IN_REPAIR',
        notes || null,
        req.user?.email || req.user?.name || 'sistema'
      );
    });

    res.json({ message: 'Reparación iniciada' });
  } catch (err) {
    console.error('stock startRepair error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/stock/:id/finish-repair ───────────────────────
const finishRepair = async (req, res) => {
  try {
    const { repairCost, notes } = req.body;

    const stockTire = await prisma.stock_tires.findUnique({
      where: { id: req.params.id },
    });

    if (!stockTire) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    if (stockTire.lifecycle !== 'IN_REPAIR') {
      return res.status(400).json({ error: 'El neumático no está en reparación' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stock_tires.update({
        where: { id: stockTire.id },
        data: { lifecycle: 'REPAIRED_AVAILABLE' },
      });

      await addLifecycleEvent(
        tx,
        stockTire.id,
        'FINISH_REPAIR',
        'IN_REPAIR',
        'REPAIRED_AVAILABLE',
        `${repairCost ? `Costo reparación: ${repairCost}` : ''}${notes ? ` · ${notes}` : ''}`,
        req.user?.email || req.user?.name || 'sistema'
      );
    });

    res.json({ message: 'Reparación completada — listo para instalar' });
  } catch (err) {
    console.error('stock finishRepair error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/stock/:id/scrap ───────────────────────────────
const scrap = async (req, res) => {
  try {
    const { reason, notes } = req.body;

    const stockTire = await prisma.stock_tires.findUnique({
      where: { id: req.params.id },
    });

    if (!stockTire) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    await prisma.$transaction(async (tx) => {
      if (stockTire.currentTireId) {
        await tx.tires.update({
          where: { id: stockTire.currentTireId },
          data: {
            status: 'RETIRED',
            isActive: false,
          },
        });
      }

      await tx.stock_tires.update({
        where: { id: stockTire.id },
        data: {
          lifecycle: 'SCRAPPED',
          currentTireId: null,
        },
      });

      await addLifecycleEvent(
        tx,
        stockTire.id,
        'SCRAP',
        stockTire.lifecycle,
        'SCRAPPED',
        notes || reason || 'Enviado a desecho REP',
        req.user?.email || req.user?.name || 'sistema'
      );
    });

    res.json({ message: 'Neumático enviado a desecho — registrar en REP' });
  } catch (err) {
    console.error('stock scrap error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/stock/available ────────────────────────────────
const getAvailable = async (req, res) => {
  try {
    const { size } = req.query;

    const tires = await prisma.stock_tires.findMany({
      where: {
        lifecycle: { in: ['NEW_AVAILABLE', 'REPAIRED_AVAILABLE'] },
        ...(size ? { size: { contains: size, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ lifecycle: 'asc' }, { code: 'asc' }],
    });

    res.json(tires);
  } catch (err) {
    console.error('stock getAvailable error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/stock/next-code ────────────────────────────────
const nextCode = async (req, res) => {
  try {
    const last = await prisma.stock_tires.findFirst({
      where: { code: { startsWith: 'TIRE-' } },
      orderBy: { code: 'desc' },
    });

    let next = 'TIRE-0001';

    if (last) {
      const num = parseInt(last.code.replace('TIRE-', '').split('-')[0], 10) + 1;
      next = `TIRE-${String(num).padStart(4, '0')}`;
    }

    res.json({ code: next });
  } catch (err) {
    console.error('stock nextCode error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  install,
  withdraw,
  startRepair,
  finishRepair,
  scrap,
  getAvailable,
  nextCode,
};