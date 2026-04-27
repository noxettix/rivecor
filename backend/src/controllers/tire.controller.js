const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function computeStatus({ currentDepth, pressure, recommendedPressure, mileage, maxMileage }) {
  if (currentDepth != null) {
    if (Number(currentDepth) < 3) return 'CRITICAL';
    if (Number(currentDepth) < 5) return 'WARNING';
  }

  if (pressure && recommendedPressure) {
    const d = Math.abs(Number(pressure) - Number(recommendedPressure)) / Number(recommendedPressure);
    if (d > 0.20) return 'CRITICAL';
    if (d > 0.10) return 'WARNING';
  }

  if (mileage && maxMileage) {
    const r = Number(mileage) / Number(maxMileage);
    if (r > 0.95) return 'CRITICAL';
    if (r > 0.80) return 'WARNING';
  }

  return 'OK';
}

function analyzeTire(tire) {
  const messages = [];
  let riskLevel = 'low';

  if (tire.currentDepth != null) {
    if (Number(tire.currentDepth) < 3) {
      messages.push(`⚠️ Surco crítico: ${tire.currentDepth}mm`);
      riskLevel = 'critical';
    } else if (Number(tire.currentDepth) < 5) {
      messages.push(`🟡 Surco bajo: ${tire.currentDepth}mm`);
      riskLevel = 'medium';
    }
  }

  if (tire.pressure && tire.recommendedPressure) {
    const diff = Number(tire.pressure) - Number(tire.recommendedPressure);
    const pct = Math.round(
      (Math.abs(diff) / Number(tire.recommendedPressure)) * 100
    );

    if (pct > 10) {
      messages.push(
        `${pct > 20 ? '⚠️' : '🟡'} Presión desviada ${pct}%`
      );

      if (pct > 20) riskLevel = 'critical';
      else if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  if (tire.mileage && tire.maxMileage) {
    const pct = Math.round((Number(tire.mileage) / Number(tire.maxMileage)) * 100);

    if (pct >= 95) {
      messages.push(`⚠️ Kilometraje al ${pct}%`);
      riskLevel = 'critical';
    } else if (pct >= 80) {
      messages.push(`🟡 Kilometraje al ${pct}%`);
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  let estimatedLoss = 0;

  if (tire.pressure && tire.recommendedPressure) {
    estimatedLoss +=
      (Math.abs(Number(tire.pressure) - Number(tire.recommendedPressure)) /
        Number(tire.recommendedPressure)) *
      15;
  }

  return {
    messages,
    riskLevel,
    estimatedLoss: Math.round(estimatedLoss),
  };
}

const getByEquipment = async (req, res) => {
  try {
    const tires = await prisma.tires.findMany({
      where: {
        equipmentId: req.params.equipmentId,
        isActive: true,
      },
      include: {
        tire_inspections: {
          take: 5,
          orderBy: {
            inspectedAt: 'desc',
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    res.json(tires.map((t) => ({ ...t, analysis: analyzeTire(t) })));
  } catch (e) {
    console.error('getByEquipment tire error:', e);
    res.status(500).json({ error: e.message });
  }
};

const getById = async (req, res) => {
  try {
    const tire = await prisma.tires.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        equipments: {
          include: {
            companies: true,
          },
        },
        tire_inspections: {
          orderBy: {
            inspectedAt: 'desc',
          },
        },
      },
    });

    if (!tire) return res.status(404).json({ error: 'No encontrado' });

    res.json({ ...tire, analysis: analyzeTire(tire) });
  } catch (e) {
    console.error('getById tire error:', e);
    res.status(500).json({ error: e.message });
  }
};

const create = async (req, res) => {
  try {
    const data = {
      ...req.body,
      status: computeStatus(req.body),
    };

    const tire = await prisma.tires.create({
      data,
    });

    res.status(201).json(tire);
  } catch (e) {
    console.error('create tire error:', e);
    res.status(500).json({ error: e.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.tires.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) return res.status(404).json({ error: 'No encontrado' });

    const merged = {
      ...existing,
      ...req.body,
    };

    const data = {
      ...req.body,
      status: computeStatus(merged),
    };

    const tire = await prisma.tires.update({
      where: {
        id: req.params.id,
      },
      data,
    });

    res.json({ ...tire, analysis: analyzeTire(tire) });
  } catch (e) {
    console.error('update tire error:', e);
    res.status(500).json({ error: e.message });
  }
};

const registerInspection = async (req, res) => {
  try {
    const { depth, pressure, mileage, observations, inspectedBy } = req.body;

    const existing = await prisma.tires.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existing) return res.status(404).json({ error: 'Neumático no encontrado' });

    const status = computeStatus({
      currentDepth: depth,
      pressure,
      recommendedPressure: existing.recommendedPressure,
      mileage,
      maxMileage: existing.maxMileage,
    });

    const [inspection, tire] = await prisma.$transaction([
      prisma.tire_inspections.create({
        data: {
          tireId: req.params.id,
          depth: depth != null ? Number(depth) : null,
          pressure: pressure != null ? Number(pressure) : null,
          mileage: mileage != null ? Number(mileage) : null,
          status,
          observations,
          inspectedBy,
        },
      }),

      prisma.tires.update({
        where: {
          id: req.params.id,
        },
        data: {
          currentDepth: depth != null ? Number(depth) : null,
          pressure: pressure != null ? Number(pressure) : null,
          mileage: mileage != null ? Number(mileage) : null,
          status,
          lastInspection: new Date(),
        },
      }),
    ]);

    res.status(201).json({
      inspection,
      tire: {
        ...tire,
        analysis: analyzeTire(tire),
      },
    });
  } catch (e) {
    console.error('registerInspection tire error:', e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getByEquipment,
  getById,
  create,
  update,
  registerInspection,
};