// backend/src/controllers/cost.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/costs/tire/:tireId  — costo x km por neumático
const getTireCostPerKm = async (req, res) => {
  try {
    const tire = await prisma.tire.findUnique({
      where: { id: req.params.tireId },
      include: {
        equipment: { select: { name: true, code: true } },
        inspections: { orderBy: { inspectedAt: 'asc' } },
        maintenances: {
          include: {
            maintenance: {
              include: {
                request: { include: { equipment: { select: { name: true } } } }
              }
            }
          }
        }
      }
    });

    if (!tire) return res.status(404).json({ error: 'Neumático no encontrado' });

    const analysis = computeTireCostAnalysis(tire);
    res.json({ tire, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/costs/equipment/:equipmentId — resumen costos de todos los neumáticos
const getEquipmentCosts = async (req, res) => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: req.params.equipmentId },
      include: {
        company: { select: { name: true } },
        tires: {
          where: { isActive: true },
          include: {
            inspections: { orderBy: { inspectedAt: 'asc' } },
            maintenances: true
          }
        }
      }
    });

    if (!equipment) return res.status(404).json({ error: 'Equipo no encontrado' });

    const tiresAnalysis = equipment.tires.map(tire => ({
      tire: {
        id: tire.id, position: tire.position, brand: tire.brand,
        size: tire.size, status: tire.status
      },
      analysis: computeTireCostAnalysis(tire)
    }));

    const totalCostPerKm = tiresAnalysis.reduce((sum, t) => sum + (t.analysis.costPerKm || 0), 0);
    const totalInvestment = tiresAnalysis.reduce((sum, t) => sum + (t.analysis.totalCost || 0), 0);
    const totalKm = tiresAnalysis.reduce((sum, t) => sum + (t.analysis.currentKm || 0), 0);
    const avgLifeUsed = tiresAnalysis.length > 0
      ? tiresAnalysis.reduce((sum, t) => sum + (t.analysis.lifeUsedPct || 0), 0) / tiresAnalysis.length
      : 0;

    res.json({
      equipment: { id: equipment.id, name: equipment.name, code: equipment.code, company: equipment.company },
      summary: {
        totalTires: tiresAnalysis.length,
        totalInvestment: Math.round(totalInvestment),
        totalCostPerKm: parseFloat(totalCostPerKm.toFixed(2)),
        totalKm,
        avgLifeUsedPct: Math.round(avgLifeUsed)
      },
      tires: tiresAnalysis
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/costs/company  — vista global para Rivecor
const getCompanyCosts = async (req, res) => {
  try {
    const companyId = req.user.role === 'CLIENT' ? req.user.companyId : req.query.companyId;

    const tires = await prisma.tire.findMany({
      where: {
        isActive: true,
        equipment: { companyId: companyId || undefined }
      },
      include: {
        equipment: { select: { name: true, code: true, companyId: true } },
        inspections: { orderBy: { inspectedAt: 'asc' } }
      }
    });

    // Agrupar por equipo
    const byEquipment = {};
    tires.forEach(tire => {
      const key = tire.equipmentId;
      if (!byEquipment[key]) {
        byEquipment[key] = {
          equipmentId: key,
          equipmentName: tire.equipment.name,
          equipmentCode: tire.equipment.code,
          tires: []
        };
      }
      byEquipment[key].tires.push({
        id: tire.id,
        position: tire.position,
        brand: tire.brand,
        status: tire.status,
        analysis: computeTireCostAnalysis(tire)
      });
    });

    res.json(Object.values(byEquipment));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Lógica de cálculo costo x km ─────────────────────────────────────────
function computeTireCostAnalysis(tire) {
  const purchasePrice = tire.purchasePrice || 0;
  const currentKm     = tire.mileage || 0;
  const maxKm         = tire.maxMileage || null;
  const initialDepth  = tire.initialDepth || 18;
  const currentDepth  = tire.currentDepth || initialDepth;

  // Vida útil usada en %
  const depthUsedPct = initialDepth > 0
    ? Math.round(((initialDepth - currentDepth) / initialDepth) * 100)
    : 0;
  const lifeUsedPct = maxKm ? Math.round((currentKm / maxKm) * 100) : depthUsedPct;

  // Costo por km
  const costPerKm = purchasePrice > 0 && currentKm > 0
    ? parseFloat((purchasePrice / currentKm).toFixed(4))
    : null;

  // Proyección de vida útil restante en km
  const remainingKm = maxKm ? Math.max(0, maxKm - currentKm) : null;

  // Costo total incluyendo mantenciones
  const maintenanceCost = tire.maintenanceCost || 0;
  const totalCost = purchasePrice + maintenanceCost;
  const totalCostPerKm = totalCost > 0 && currentKm > 0
    ? parseFloat((totalCost / currentKm).toFixed(4))
    : null;

  // Proyección hasta fin de vida
  const projectedTotalCostPerKm = totalCost > 0 && maxKm
    ? parseFloat((totalCost / maxKm).toFixed(4))
    : null;

  // Pérdida estimada por presión incorrecta
  let pressureLossPct = 0;
  if (tire.pressure && tire.recommendedPressure) {
    const dev = Math.abs(tire.pressure - tire.recommendedPressure) / tire.recommendedPressure;
    pressureLossPct = Math.round(dev * 15); // cada 10% desviación ≈ 1.5% consumo extra
  }

  // Ahorro potencial si se reemplaza ahora vs seguir
  const savingsPotential = lifeUsedPct > 90 && purchasePrice > 0
    ? Math.round(purchasePrice * 0.2) // estimación 20% ahorro en mantención
    : 0;

  return {
    purchasePrice,
    maintenanceCost,
    totalCost,
    currentKm,
    maxKm,
    costPerKm,
    totalCostPerKm,
    projectedTotalCostPerKm,
    lifeUsedPct,
    depthUsedPct,
    remainingKm,
    pressureLossPct,
    savingsPotential,
    recommendation: buildRecommendation(lifeUsedPct, costPerKm, pressureLossPct)
  };
}

function buildRecommendation(lifeUsedPct, costPerKm, pressureLossPct) {
  if (lifeUsedPct >= 95) return 'Reemplazo inmediato — vida útil agotada';
  if (lifeUsedPct >= 80) return 'Planificar reemplazo en próxima mantención';
  if (pressureLossPct >= 15) return 'Ajustar presión — pérdida económica significativa';
  if (pressureLossPct >= 5)  return 'Revisar presión en próxima visita';
  return 'Estado óptimo — continuar monitoreo regular';
}

module.exports = { getTireCostPerKm, getEquipmentCosts, getCompanyCosts };
