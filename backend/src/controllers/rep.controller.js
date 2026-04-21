// backend/src/controllers/rep.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/rep/records — listar todos los retiros REP
const getRecords = async (req, res) => {
  try {
    const companyId = req.user.role === 'CLIENT' ? req.user.companyId : req.query.companyId;

    const records = await prisma.repRecord.findMany({
      where: companyId ? { equipment: { companyId } } : {},
      include: {
        equipment: { select: { name: true, code: true } },
        tire: { select: { position: true, brand: true, size: true, dot: true } },
        registeredBy: { select: { name: true } }
      },
      orderBy: { retiredAt: 'desc' }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/rep/records — registrar retiro
const createRecord = async (req, res) => {
  try {
    const {
      tireId, equipmentId, retiredAt, reason,
      condition, disposalPoint, disposalEntity,
      weightKg, notes, invoiceNumber
    } = req.body;

    const record = await prisma.repRecord.create({
      data: {
        tireId, equipmentId,
        retiredAt: retiredAt ? new Date(retiredAt) : new Date(),
        reason: reason || 'WEAR',
        condition: condition || 'WORN',
        disposalPoint, disposalEntity,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        notes, invoiceNumber,
        registeredById: req.user.id,
        status: 'REGISTERED'
      },
      include: {
        equipment: { select: { name: true, code: true } },
        tire: { select: { position: true, brand: true, size: true } }
      }
    });

    // Marcar neumático como RETIRED
    await prisma.tire.update({
      where: { id: tireId },
      data: { status: 'RETIRED', isActive: false }
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/rep/report — reporte HTML para auditoría
const getReport = async (req, res) => {
  try {
    const companyId = req.user.role === 'CLIENT' ? req.user.companyId : req.query.companyId;
    const year = req.query.year || new Date().getFullYear();

    const [records, company] = await Promise.all([
      prisma.repRecord.findMany({
        where: {
          ...(companyId ? { equipment: { companyId } } : {}),
          retiredAt: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`)
          }
        },
        include: {
          equipment: { include: { company: { select: { name: true, rut: true } } } },
          tire: true,
          registeredBy: { select: { name: true } }
        },
        orderBy: { retiredAt: 'asc' }
      }),
      companyId ? prisma.company.findUnique({ where: { id: companyId } }) : Promise.resolve(null)
    ]);

    const totalWeight = records.reduce((sum, r) => sum + (r.weightKg || 0), 0);
    const html = buildREPReport({ records, company, year, totalWeight });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/rep/records/:id — actualizar estado
const updateRecord = async (req, res) => {
  try {
    const record = await prisma.repRecord.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── HTML del reporte REP ────────────────────────────────────
function buildREPReport({ records, company, year, totalWeight }) {
  const REASON_MAP = {
    WEAR: 'Desgaste normal', DAMAGE: 'Daño / accidente',
    PRESSURE: 'Falla por presión', OTHER: 'Otro'
  };
  const CONDITION_MAP = {
    WORN: 'Desgastado', DAMAGED: 'Dañado', REPAIRABLE: 'Reparable'
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Reporte REP ${year} — ${company?.name || 'Todas las empresas'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#222; padding:32px; }
  .header { background:#0A0A0A; color:#F5C800; padding:20px 24px; border-radius:8px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; }
  .header h1 { font-size:20px; letter-spacing:1px; }
  .header p  { font-size:11px; color:#ccc; margin-top:2px; }
  .section { border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-bottom:16px; }
  .section h3 { font-size:13px; color:#1E4D8C; margin-bottom:12px; border-bottom:1px solid #e5e7eb; padding-bottom:6px; }
  .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
  .kpi { background:#f9fafb; border-radius:8px; padding:12px; text-align:center; border:1px solid #e5e7eb; }
  .kpi-value { font-size:24px; font-weight:700; color:#1E4D8C; }
  .kpi-label { font-size:10px; color:#6B7280; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#f3f4f6; padding:8px 6px; text-align:left; font-size:10px; color:#555; border:1px solid #e5e7eb; }
  td { padding:7px 6px; border:1px solid #e5e7eb; }
  tr:nth-child(even) td { background:#f9fafb; }
  .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; }
  .badge-reg    { background:#DCFCE7; color:#15803D; }
  .badge-sent   { background:#DBEAFE; color:#1D4ED8; }
  .footer { margin-top:24px; text-align:center; font-size:10px; color:#888; border-top:1px solid #e5e7eb; padding-top:12px; }
  @media print { body { padding:16px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>RIVECOR — Reporte Ley REP</h1>
      <p>Registro de Disposición Final de Neumáticos — Año ${year}</p>
      <p>Ley 20.920 — Responsabilidad Extendida del Productor</p>
    </div>
    <div style="text-align:right;">
      <p style="color:#aaa;font-size:10px;">Generado</p>
      <p style="color:#F5C800;font-weight:600;">${new Date().toLocaleDateString('es-CL')}</p>
    </div>
  </div>

  ${company ? `
  <div class="section">
    <h3>Datos de la Empresa</h3>
    <table>
      <tr><td style="width:30%;font-weight:600;">Razón Social</td><td>${company.name}</td></tr>
      <tr><td style="font-weight:600;">RUT</td><td>${company.rut || '—'}</td></tr>
      <tr><td style="font-weight:600;">Dirección</td><td>${company.address || '—'}</td></tr>
      <tr><td style="font-weight:600;">Período reportado</td><td>01/01/${year} — 31/12/${year}</td></tr>
    </table>
  </div>` : ''}

  <div class="summary-grid">
    <div class="kpi"><div class="kpi-value">${records.length}</div><div class="kpi-label">Neumáticos retirados</div></div>
    <div class="kpi"><div class="kpi-value">${totalWeight.toFixed(1)} kg</div><div class="kpi-label">Peso total</div></div>
    <div class="kpi"><div class="kpi-value">${records.filter(r=>r.status==='SENT_TO_DISPOSAL').length}</div><div class="kpi-label">Enviados a disposición</div></div>
    <div class="kpi"><div class="kpi-value">${records.filter(r=>r.status==='REGISTERED').length}</div><div class="kpi-label">Pendientes de envío</div></div>
  </div>

  <div class="section">
    <h3>Registro Detallado de Neumáticos Retirados</h3>
    ${records.length === 0
      ? '<p style="text-align:center;color:#888;padding:20px;">Sin registros para este período</p>'
      : `<table>
          <tr>
            <th>Fecha retiro</th>
            <th>Equipo</th>
            <th>Posición</th>
            <th>Marca / Medida</th>
            <th>DOT</th>
            <th>Motivo</th>
            <th>Condición</th>
            <th>Peso (kg)</th>
            <th>Punto de disposición</th>
            <th>Estado</th>
          </tr>
          ${records.map(r => `
            <tr>
              <td>${new Date(r.retiredAt).toLocaleDateString('es-CL')}</td>
              <td>${r.equipment?.name || '—'} (${r.equipment?.code || '—'})</td>
              <td>${r.tire?.position || '—'}</td>
              <td>${r.tire?.brand || '—'} ${r.tire?.size || ''}</td>
              <td>${r.tire?.dot || '—'}</td>
              <td>${REASON_MAP[r.reason] || r.reason}</td>
              <td>${CONDITION_MAP[r.condition] || r.condition}</td>
              <td>${r.weightKg != null ? r.weightKg : '—'}</td>
              <td>${r.disposalPoint || '—'}<br/><span style="color:#888;font-size:10px;">${r.disposalEntity || ''}</span></td>
              <td><span class="badge ${r.status==='SENT_TO_DISPOSAL'?'badge-sent':'badge-reg'}">${r.status==='SENT_TO_DISPOSAL'?'Enviado':'Registrado'}</span></td>
            </tr>
          `).join('')}
        </table>`
    }
  </div>

  <div class="section">
    <h3>Declaración de Cumplimiento</h3>
    <p style="font-size:11px;line-height:1.6;color:#444;">
      La empresa ${company?.name || '___________'}, RUT ${company?.rut || '___________'}, declara que los neumáticos
      registrados en el presente documento han sido gestionados de acuerdo a lo establecido en la Ley 20.920
      (Ley REP — Marco para la Gestión de Residuos, la Responsabilidad Extendida del Productor y el Fomento al
      Reciclaje) y su reglamento, siendo entregados a operadores autorizados para su disposición final o
      valorización.
    </p>
    <div style="margin-top:40px;display:flex;justify-content:space-between;">
      <div style="text-align:center;width:45%;">
        <div style="border-top:1px solid #333;padding-top:8px;">
          <p style="font-size:11px;font-weight:600;">Firma Responsable</p>
          <p style="font-size:10px;color:#888;">${company?.contactName || 'Nombre'} · ${new Date().toLocaleDateString('es-CL')}</p>
        </div>
      </div>
      <div style="text-align:center;width:45%;">
        <div style="border-top:1px solid #333;padding-top:8px;">
          <p style="font-size:11px;font-weight:600;">Evelyn Rivera — Rivecor</p>
          <p style="font-size:10px;color:#888;">Servicio Eco Móvil 360 · ${new Date().toLocaleDateString('es-CL')}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Rivecor Eco Móvil 360 — Documento generado automáticamente el ${new Date().toLocaleString('es-CL')}</p>
    <p style="margin-top:4px;">Este reporte certifica el cumplimiento de la Ley 20.920 para el período indicado.</p>
  </div>
</body>
</html>`;
}

module.exports = { getRecords, createRecord, getReport, updateRecord };
