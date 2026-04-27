const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function computeCostAnalysis(tire) {
  const purchasePrice = Number(tire.purchasePrice || 0);
  const maintenanceCost = Number(tire.maintenanceCost || 0);
  const totalCost = purchasePrice + maintenanceCost;

  const currentKm = Number(tire.mileage || 0);
  const maxKm = Number(tire.maxMileage || 0);

  const costPerKm =
    currentKm > 0 ? Number((purchasePrice / currentKm).toFixed(4)) : null;

  const totalCostPerKm =
    currentKm > 0 ? Number((totalCost / currentKm).toFixed(4)) : null;

  const lifeUsedPct =
    maxKm > 0 ? Math.min(Math.round((currentKm / maxKm) * 100), 100) : 0;

  const initialDepth = Number(tire.initialDepth || 25);
  const currentDepth = Number(
    tire.currentDepth != null ? tire.currentDepth : initialDepth
  );

  const depthUsedPct =
    initialDepth > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(((initialDepth - currentDepth) / initialDepth) * 100)
          )
        )
      : 0;

  const remainingKm = maxKm > 0 ? Math.max(maxKm - currentKm, 0) : null;

  const recommendedPressure = Number(tire.recommendedPressure || 0);
  const currentPressure = Number(tire.pressure || 0);

  const pressureLossPct =
    recommendedPressure > 0 && currentPressure > 0
      ? Math.abs(
          Math.round(
            ((recommendedPressure - currentPressure) / recommendedPressure) *
              100
          )
        )
      : 0;

  let recommendation = 'Estado óptimo — continuar monitoreo regular';

  if (lifeUsedPct >= 90) {
    recommendation = 'Neumático al final de su vida útil — programar reemplazo';
  } else if (lifeUsedPct >= 70) {
    recommendation = 'Desgaste avanzado — revisar y planificar cambio';
  } else if (pressureLossPct >= 15) {
    recommendation = 'Pérdida de presión relevante — inspeccionar';
  } else if (depthUsedPct >= 80) {
    recommendation = 'Desgaste de surco elevado — revisar condición';
  }

  return {
    purchasePrice,
    maintenanceCost,
    totalCost,
    currentKm,
    maxKm,
    costPerKm,
    totalCostPerKm,
    lifeUsedPct,
    depthUsedPct,
    remainingKm,
    pressureLossPct,
    recommendation,
  };
}

async function collectReportData(companyId) {
  const [equipments, maintenanceForms, mechanics] = await Promise.all([
    prisma.equipments.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        isActive: true,
      },
      include: {
        companies: { select: { name: true } },
        tires: {
          where: { isActive: true },
          include: {
            tire_inspections: {
              orderBy: { inspectedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),

    prisma.maintenance_forms.findMany({
      where: {
        status: 'COMPLETED',
        ...(companyId ? { equipments: { companyId } } : {}),
      },
      include: {
        equipments: {
          select: {
            name: true,
            code: true,
            location: true,
          },
        },
        mechanics: {
          select: {
            name: true,
          },
        },
        maintenance_tire_forms: {
          include: {
            tires: {
              select: {
                position: true,
                brand: true,
                size: true,
              },
            },
          },
        },
      },
      orderBy: { performedAt: 'desc' },
      take: 200,
    }),

    prisma.mechanics.findMany({
      where: {
        isActive: true,
        ...(companyId
          ? {
              mechanic_companies: {
                some: {
                  companyId,
                },
              },
            }
          : {}),
      },
      include: {
        maintenances: {
          include: {
            maintenance_tires: true,
          },
          orderBy: {
            performedAt: 'desc',
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const companyName =
    equipments?.[0]?.companies?.name ||
    (companyId ? 'Empresa' : 'Reporte General');

  const costs = [];

  for (const eq of equipments) {
    for (const tire of eq.tires || []) {
      costs.push({
        equipmentName: eq.name || '',
        tire: {
          id: tire.id,
          position: tire.position || '',
          brand: tire.brand || '',
          size: tire.size || '',
          status: tire.status || 'OK',
        },
        analysis: computeCostAnalysis(tire),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    company: companyName,

    equipments: equipments.map((eq) => ({
      id: eq.id,
      name: eq.name || '',
      code: eq.code || '',
      company: eq.companies?.name || '',
      type: eq.type || '',
      brand: eq.brand || '',
      model: eq.model || '',
      location: eq.location || '',
      tires: (eq.tires || []).map((t) => ({
        id: t.id,
        position: t.position || '',
        brand: t.brand || '',
        size: t.size || '',
        status: t.status || 'OK',
        currentDepth: t.currentDepth,
        pressure: t.pressure,
        mileage: t.mileage,
        purchasePrice: t.purchasePrice,
        installDate: t.installDate,
        initialDepth: t.initialDepth,
        maxMileage: t.maxMileage,
        maintenanceCost: t.maintenanceCost,
        recommendedPressure: t.recommendedPressure,
      })),
    })),

    maintenances: maintenanceForms.map((f) => ({
      id: f.id,
      type: f.type || '',
      equipmentName: f.equipments?.name || '',
      equipmentCode: f.equipments?.code || '',
      mechanicName: f.mechanics?.name || '',
      performedAt: f.performedAt || null,
      observations: f.observations || '',
      nextScheduled: f.nextScheduled || null,
      tiresWorked: (f.maintenance_tire_forms || []).map((t) => ({
        position: t.tires?.position || '',
        brand: t.tires?.brand || '',
        size: t.tires?.size || '',
        action: t.action || '',
        depthBefore: t.depthBefore,
        depthAfter: t.depthAfter,
        pressureBefore: t.pressureBefore,
        pressureAfter: t.pressureAfter,
        cost: t.cost || 0,
      })),
    })),

    mechanics: mechanics.map((m) => {
      const maintenances = m.maintenances || [];

      const totalMaintenances = maintenances.length;

      const totalTiresWorked = maintenances.reduce(
        (sum, mn) => sum + (mn.maintenance_tires?.length || 0),
        0
      );

      const replacements = maintenances.filter(
        (mn) => mn.type === 'REPLACEMENT'
      ).length;

      const rotations = maintenances.filter(
        (mn) => mn.type === 'ROTATION'
      ).length;

      const inspections = maintenances.filter(
        (mn) => mn.type === 'INSPECTION'
      ).length;

      const lastActivity =
        maintenances
          .map((mn) => mn.performedAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || null;

      return {
        id: m.id,
        name: m.name || '',
        rut: m.rut || '',
        speciality: m.speciality || '',
        phone: m.phone || '',
        stats: {
          totalMaintenances,
          totalTiresWorked,
          replacements,
          rotations,
          inspections,
          lastActivity,
        },
      };
    }),

    costs,
  };
}

function generateExcel(payload, sheetFilter = null) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const tmpIn = path.join('/tmp', `rivecor_in_${timestamp}.json`);
    const tmpOut = path.join('/tmp', `rivecor_out_${timestamp}.xlsx`);
    const scriptPath = path.join(__dirname, '../../scripts/generate_excel.py');

    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      for (const file of [tmpIn, tmpOut]) {
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    };

    try {
      if (!fs.existsSync(scriptPath)) {
        return reject(new Error(`No existe el script Python: ${scriptPath}`));
      }

      fs.writeFileSync(tmpIn, JSON.stringify(payload), 'utf8');

      const args = [scriptPath, tmpIn, tmpOut];
      if (sheetFilter) args.push(sheetFilter);

      const proc = spawn('python3', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          proc.kill('SIGKILL');
        } catch {}
        cleanup();
        reject(new Error('Timeout generando Excel'));
      }, 30000);

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        cleanup();
        reject(new Error(`No se pudo ejecutar python3: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);

        try {
          if (code !== 0) {
            console.error('Python stdout:', stdout);
            console.error('Python stderr:', stderr);
            reject(
              new Error(
                `Error generando Excel: ${
                  stderr?.trim() || stdout?.trim() || `exit ${code}`
                }`
              )
            );
            return;
          }

          if (!fs.existsSync(tmpOut)) {
            reject(new Error('El archivo Excel no fue generado'));
            return;
          }

          const buf = fs.readFileSync(tmpOut);
          resolve(buf);
        } catch (err) {
          reject(err);
        } finally {
          cleanup();
        }
      });
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      cleanup();
      reject(err);
    }
  });
}

const downloadFull = async (req, res) => {
  try {
    const companyId =
      req.user.role === 'CLIENT' ? req.user.companyId : req.query.companyId;

    const payload = await collectReportData(companyId);
    const buf = await generateExcel(payload);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Rivecor_Reporte_Completo.xlsx"'
    );

    return res.send(buf);
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({
      error: err.message || 'No se pudo generar el reporte Excel',
    });
  }
};

async function downloadSheet(req, res, sheet, filename) {
  try {
    const companyId =
      req.user.role === 'CLIENT' ? req.user.companyId : req.query.companyId;

    const payload = await collectReportData(companyId);
    const buf = await generateExcel(payload, sheet);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(buf);
  } catch (err) {
    console.error('Sheet error:', err);
    return res.status(500).json({
      error: err.message || 'No se pudo generar la hoja Excel',
    });
  }
}

const downloadTires = (req, res) =>
  downloadSheet(req, res, 'tires', 'Rivecor_Neumaticos.xlsx');

const downloadHistory = (req, res) =>
  downloadSheet(req, res, 'history', 'Rivecor_Historial.xlsx');

const downloadCosts = (req, res) =>
  downloadSheet(req, res, 'costs', 'Rivecor_Costos_x_Km.xlsx');

const downloadMechanics = (req, res) =>
  downloadSheet(req, res, 'mechanics', 'Rivecor_Mecanicos.xlsx');

module.exports = {
  downloadFull,
  downloadTires,
  downloadHistory,
  downloadCosts,
  downloadMechanics,
};