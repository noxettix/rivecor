const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function computeStatus({ currentDepth, pressure, recommendedPressure, mileage, maxMileage }) {
  if (currentDepth != null) { if (currentDepth < 3) return 'CRITICAL'; if (currentDepth < 5) return 'WARNING'; }
  if (pressure && recommendedPressure) {
    const d = Math.abs(pressure - recommendedPressure) / recommendedPressure;
    if (d > 0.20) return 'CRITICAL'; if (d > 0.10) return 'WARNING';
  }
  if (mileage && maxMileage) {
    const r = mileage / maxMileage;
    if (r > 0.95) return 'CRITICAL'; if (r > 0.80) return 'WARNING';
  }
  return 'OK';
}

function analyzeTire(tire) {
  const messages = [];
  let riskLevel = 'low';
  if (tire.currentDepth != null) {
    if (tire.currentDepth < 3) { messages.push(`⚠️ Surco crítico: ${tire.currentDepth}mm (mínimo recomendado 4mm)`); riskLevel = 'critical'; }
    else if (tire.currentDepth < 5) { messages.push(`🟡 Surco bajo: ${tire.currentDepth}mm — programar reemplazo`); if (riskLevel === 'low') riskLevel = 'medium'; }
  }
  if (tire.pressure && tire.recommendedPressure) {
    const diff = tire.pressure - tire.recommendedPressure;
    const pct  = Math.round(Math.abs(diff) / tire.recommendedPressure * 100);
    if (pct > 10) {
      messages.push(`${pct > 20 ? '⚠️' : '🟡'} Presión ${diff > 0 ? 'sobre' : 'bajo'}-inflado: ${tire.pressure} PSI (rec. ${tire.recommendedPressure} PSI, desviación ${pct}%)`);
      if (pct > 20 && riskLevel !== 'critical') riskLevel = 'critical'; else if (riskLevel === 'low') riskLevel = 'medium';
    }
  }
  if (tire.mileage && tire.maxMileage) {
    const pct = Math.round(tire.mileage / tire.maxMileage * 100);
    if (pct >= 95) { messages.push(`⚠️ Kilometraje al ${pct}% — reemplazo urgente`); riskLevel = 'critical'; }
    else if (pct >= 80) { messages.push(`🟡 Kilometraje al ${pct}% — planificar reemplazo`); if (riskLevel === 'low') riskLevel = 'medium'; }
  }
  let estimatedLoss = 0;
  if (tire.pressure && tire.recommendedPressure) {
    estimatedLoss += Math.abs(tire.pressure - tire.recommendedPressure) / tire.recommendedPressure * 15;
  }
  return { messages, riskLevel, estimatedLoss: Math.round(estimatedLoss) };
}

const getByEquipment = async (req, res) => {
  try {
    const tires = await prisma.tire.findMany({
      where: { equipmentId: req.params.equipmentId, isActive: true },
      include: { inspections: { take: 5, orderBy: { inspectedAt: 'desc' } } },
      orderBy: { position: 'asc' }
    });
    res.json(tires.map(t => ({ ...t, analysis: analyzeTire(t) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getById = async (req, res) => {
  try {
    const tire = await prisma.tire.findUnique({
      where: { id: req.params.id },
      include: { equipment: { include: { company: true } }, inspections: { orderBy: { inspectedAt: 'desc' } } }
    });
    if (!tire) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ...tire, analysis: analyzeTire(tire) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const create = async (req, res) => {
  try {
    const data = { ...req.body, status: computeStatus(req.body) };
    const tire = await prisma.tire.create({ data });
    res.status(201).json(tire);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.tire.findUnique({ where: { id: req.params.id } });
    const merged = { ...existing, ...req.body };
    const data = { ...req.body, status: computeStatus(merged) };
    const tire = await prisma.tire.update({ where: { id: req.params.id }, data });
    res.json({ ...tire, analysis: analyzeTire(tire) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const registerInspection = async (req, res) => {
  try {
    const { depth, pressure, mileage, observations, inspectedBy } = req.body;
    const status = computeStatus({ currentDepth: depth, pressure, mileage });
    const [inspection, tire] = await prisma.$transaction([
      prisma.tireInspection.create({ data: { tireId: req.params.id, depth, pressure, mileage, status, observations, inspectedBy } }),
      prisma.tire.update({ where: { id: req.params.id }, data: { currentDepth: depth, pressure, mileage, status, lastInspection: new Date() } })
    ]);
    res.status(201).json({ inspection, tire: { ...tire, analysis: analyzeTire(tire) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getByEquipment, getById, create, update, registerInspection };
