const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

const getRecords = async (req, res) => {
  try {
    const records = await prisma.rep_records.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        stock_tires: true,
        tires: {
          include: {
            equipments: true,
          },
        },
      },
    });

    res.json(records);
  } catch (err) {
    console.error('REP getRecords error:', err);
    res.status(500).json({ error: err.message });
  }
};

const createRecord = async (req, res) => {
  try {
    const {
      tireId,
      stockTireId,
      year,
      month,
      quantity,
      weight,
      weightKg,
      disposalMethod,
      disposalPoint,
      disposalCompany,
      disposalEntity,
      certificate,
      invoiceNumber,
      notes,
    } = req.body;

    const ym = getYearMonth();

    const record = await prisma.rep_records.create({
      data: {
        tireId: tireId || null,
        stockTireId: stockTireId || null,
        year: Number(year || ym.year),
        month: month ? Number(month) : ym.month,
        quantity: quantity ? Number(quantity) : 1,
        weight:
          weight != null && weight !== ''
            ? Number(weight)
            : weightKg != null && weightKg !== ''
            ? Number(weightKg)
            : null,
        disposalMethod: disposalMethod || disposalPoint || null,
        disposalCompany: disposalCompany || disposalEntity || null,
        certificate: certificate || invoiceNumber || null,
        notes: notes || null,
      },
      include: {
        stock_tires: true,
        tires: {
          include: {
            equipments: true,
          },
        },
      },
    });

    if (tireId) {
      await prisma.tires.update({
        where: { id: tireId },
        data: {
          status: 'RETIRED',
          isActive: false,
        },
      });
    }

    if (stockTireId) {
      await prisma.stock_tires.update({
        where: { id: stockTireId },
        data: {
          lifecycle: 'SCRAPPED',
        },
      });
    }

    res.status(201).json(record);
  } catch (err) {
    console.error('REP createRecord error:', err);
    res.status(500).json({ error: err.message });
  }
};

const updateRecord = async (req, res) => {
  try {
    const {
      year,
      month,
      quantity,
      weight,
      weightKg,
      disposalMethod,
      disposalPoint,
      disposalCompany,
      disposalEntity,
      certificate,
      invoiceNumber,
      notes,
    } = req.body;

    const data = {};

    if (year != null) data.year = Number(year);
    if (month != null) data.month = Number(month);
    if (quantity != null) data.quantity = Number(quantity);

    if (weight != null && weight !== '') data.weight = Number(weight);
    if (weightKg != null && weightKg !== '') data.weight = Number(weightKg);

    if (disposalMethod !== undefined) data.disposalMethod = disposalMethod;
    if (disposalPoint !== undefined) data.disposalMethod = disposalPoint;

    if (disposalCompany !== undefined) data.disposalCompany = disposalCompany;
    if (disposalEntity !== undefined) data.disposalCompany = disposalEntity;

    if (certificate !== undefined) data.certificate = certificate;
    if (invoiceNumber !== undefined) data.certificate = invoiceNumber;

    if (notes !== undefined) data.notes = notes;

    const record = await prisma.rep_records.update({
      where: { id: req.params.id },
      data,
    });

    res.json(record);
  } catch (err) {
    console.error('REP updateRecord error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getReport = async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());

    const records = await prisma.rep_records.findMany({
      where: { year },
      orderBy: { createdAt: 'asc' },
      include: {
        stock_tires: true,
        tires: {
          include: {
            equipments: {
              include: {
                companies: true,
              },
            },
          },
        },
      },
    });

    const totalWeight = records.reduce(
      (sum, r) => sum + Number(r.weight || 0),
      0
    );

    const totalQuantity = records.reduce(
      (sum, r) => sum + Number(r.quantity || 0),
      0
    );

    const html = buildReport({
      year,
      records,
      totalWeight,
      totalQuantity,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('REP getReport error:', err);
    res.status(500).json({ error: err.message });
  }
};

function buildReport({ year, records, totalWeight, totalQuantity }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Reporte REP ${year}</title>
<style>
body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
.header { background:#0A0A0A; color:#F5C800; padding:20px; border-radius:10px; margin-bottom:20px; }
h1 { margin:0; font-size:22px; }
p { margin:4px 0; }
.kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:20px; }
.kpi { border:1px solid #ddd; border-radius:10px; padding:14px; text-align:center; }
.kpi strong { display:block; font-size:24px; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th, td { border:1px solid #ddd; padding:8px; text-align:left; }
th { background:#f3f4f6; }
.footer { margin-top:30px; font-size:11px; color:#666; text-align:center; }
</style>
</head>
<body>
<div class="header">
  <h1>Rivecor — Reporte REP ${year}</h1>
  <p>Ley 20.920 — Registro de disposición de neumáticos</p>
</div>

<div class="kpis">
  <div class="kpi"><strong>${records.length}</strong><span>Registros</span></div>
  <div class="kpi"><strong>${totalQuantity}</strong><span>Neumáticos</span></div>
  <div class="kpi"><strong>${totalWeight.toFixed(1)} kg</strong><span>Peso total</span></div>
</div>

<table>
<thead>
<tr>
  <th>Fecha</th>
  <th>Año/Mes</th>
  <th>Neumático</th>
  <th>Equipo</th>
  <th>Cantidad</th>
  <th>Peso</th>
  <th>Método</th>
  <th>Empresa</th>
  <th>Certificado</th>
</tr>
</thead>
<tbody>
${records
  .map((r) => {
    const tire =
      r.tires ||
      r.stock_tires ||
      null;

    const equipment = r.tires?.equipments || null;

    return `
<tr>
  <td>${new Date(r.createdAt).toLocaleDateString('es-CL')}</td>
  <td>${r.year}/${r.month || '-'}</td>
  <td>${tire?.brand || '-'} ${tire?.model || ''} ${tire?.size || ''}</td>
  <td>${equipment?.code || equipment?.name || '-'}</td>
  <td>${r.quantity || 1}</td>
  <td>${r.weight != null ? r.weight + ' kg' : '-'}</td>
  <td>${r.disposalMethod || '-'}</td>
  <td>${r.disposalCompany || '-'}</td>
  <td>${r.certificate || '-'}</td>
</tr>`;
  })
  .join('')}
</tbody>
</table>

<div class="footer">
  Documento generado automáticamente por Rivecor Eco Móvil 360.
</div>
</body>
</html>`;
}

module.exports = {
  getRecords,
  createRecord,
  getReport,
  updateRecord,
};