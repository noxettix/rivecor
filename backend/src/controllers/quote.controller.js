// backend/src/controllers/quote.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/quotes/generate — generar cotización desde inspección
const generate = async (req, res) => {
  try {
    const { equipmentId, inspectionData } = req.body;

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        company: true,
        tires: { where: { isActive: true } }
      }
    });
    if (!equipment) return res.status(404).json({ error: 'Equipo no encontrado' });

    // Analizar cada neumático y generar recomendaciones con precio
    const recommendations = [];
    const tires = inspectionData?.tires || equipment.tires;

    for (const tire of tires) {
      const depth    = tire.depthAfter ?? tire.currentDepth;
      const pressure = tire.pressureAfter ?? tire.pressure;

      if (depth != null && depth < 3) {
        recommendations.push({
          tireId:      tire.tireId || tire.id,
          position:    tire.position,
          type:        'REPLACEMENT',
          urgency:     'URGENT',
          description: `Reemplazo urgente — surco ${depth}mm (crítico)`,
          estimatedPrice: tire.purchasePrice || 450000
        });
      } else if (depth != null && depth < 5) {
        recommendations.push({
          tireId:      tire.tireId || tire.id,
          position:    tire.position,
          type:        'REPLACEMENT',
          urgency:     'HIGH',
          description: `Reemplazo en próxima mantención — surco ${depth}mm`,
          estimatedPrice: tire.purchasePrice || 450000
        });
      }

      if (pressure && tire.recommendedPressure) {
        const dev = Math.abs(pressure - tire.recommendedPressure) / tire.recommendedPressure;
        if (dev > 0.10) {
          recommendations.push({
            tireId:      tire.tireId || tire.id,
            position:    tire.position,
            type:        'PRESSURE_CHECK',
            urgency:     dev > 0.20 ? 'HIGH' : 'NORMAL',
            description: `Calibración de presión — actual ${pressure} PSI (rec. ${tire.recommendedPressure} PSI)`,
            estimatedPrice: 15000
          });
        }
      }
    }

    // Calcular total
    const subtotal  = recommendations.reduce((s, r) => s + r.estimatedPrice, 0);
    const tax       = Math.round(subtotal * 0.19);
    const total     = subtotal + tax;

    // Cotización
    const quote = {
      id:         `COT-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      validUntil:  new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      equipment: {
        name:     equipment.name,
        code:     equipment.code,
        location: equipment.location
      },
      company: {
        name: equipment.company.name,
        rut:  equipment.company.rut
      },
      recommendations,
      summary: {
        totalItems:   recommendations.length,
        urgent:       recommendations.filter(r => r.urgency === 'URGENT').length,
        subtotal,
        tax,
        total
      },
      note: 'Cotización válida por 15 días. Precios referenciales, sujetos a disponibilidad de stock.'
    };

    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/quotes/html/:equipmentId — cotización como HTML imprimible
const getHTML = async (req, res) => {
  try {
    // Reusar generate con datos del equipo actual
    const equipment = await prisma.equipment.findUnique({
      where: { id: req.params.equipmentId },
      include: { company: true, tires: { where: { isActive: true } } }
    });
    if (!equipment) return res.status(404).json({ error: 'No encontrado' });

    const fakeReq = { body: { equipmentId: req.params.equipmentId, inspectionData: null } };
    const recommendations = [];

    for (const tire of equipment.tires) {
      if (tire.currentDepth != null && tire.currentDepth < 5) {
        recommendations.push({
          position:    tire.position,
          type:        tire.currentDepth < 3 ? 'REEMPLAZO URGENTE' : 'Reemplazo próximo',
          urgency:     tire.currentDepth < 3 ? 'URGENT' : 'HIGH',
          description: `Surco: ${tire.currentDepth}mm — ${tire.brand} ${tire.size}`,
          estimatedPrice: tire.purchasePrice || 450000
        });
      }
    }

    if (recommendations.length === 0) {
      return res.status(400).json({ error: 'Sin recomendaciones para cotizar en este equipo' });
    }

    const subtotal = recommendations.reduce((s,r) => s + r.estimatedPrice, 0);
    const tax      = Math.round(subtotal * 0.19);
    const total    = subtotal + tax;
    const fmt      = n => `$${Math.round(n).toLocaleString('es-CL')}`
    const validUntil = new Date(Date.now() + 15*24*60*60*1000).toLocaleDateString('es-CL')

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Cotización Rivecor</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#222;padding:32px}
  .header{background:#0A0A0A;color:#F5C800;padding:20px 24px;border-radius:8px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
  .header h1{font-size:22px;font-weight:800;letter-spacing:2px}.header p{font-size:11px;color:#aaa;margin-top:2px}
  .section{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px}
  .section h3{font-size:13px;color:#1E4D8C;margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#f3f4f6;padding:8px 6px;text-align:left;font-size:10px;color:#555;border:1px solid #e5e7eb}
  td{padding:7px 6px;border:1px solid #e5e7eb}tr:nth-child(even) td{background:#f9fafb}
  .urgent{color:#DC2626;font-weight:700}.total-row{font-weight:700;background:#f9fafb}
  .footer{margin-top:20px;font-size:10px;color:#888;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px}
  .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
  .badge-urgent{background:#FEE2E2;color:#DC2626}.badge-high{background:#FEF3C7;color:#D97706}
  @media print{body{padding:16px}}
</style>
</head>
<body>
<div class="header">
  <div><h1>RIVECOR</h1><p>Eco Móvil 360 — Cotización de Servicio</p></div>
  <div style="text-align:right">
    <p style="color:#aaa;font-size:10px">Válida hasta</p>
    <p style="color:#F5C800;font-weight:700;font-size:13px">${validUntil}</p>
  </div>
</div>
<div class="section">
  <h3>Equipo</h3>
  <p><strong>${equipment.name}</strong> (${equipment.code})</p>
  <p style="color:#666;margin-top:4px">${equipment.company.name} — ${equipment.company.rut}</p>
  ${equipment.location ? `<p style="color:#666">${equipment.location}</p>` : ''}
</div>
<div class="section">
  <h3>Recomendaciones</h3>
  <table>
    <tr><th>Posición</th><th>Recomendación</th><th>Urgencia</th><th style="text-align:right">Precio est.</th></tr>
    ${recommendations.map(r => `
    <tr>
      <td>${r.position}</td>
      <td>${r.description}</td>
      <td><span class="badge ${r.urgency==='URGENT'?'badge-urgent':'badge-high'}">${r.type}</span></td>
      <td style="text-align:right">${fmt(r.estimatedPrice)}</td>
    </tr>`).join('')}
    <tr class="total-row"><td colspan="3">Subtotal</td><td style="text-align:right">${fmt(subtotal)}</td></tr>
    <tr class="total-row"><td colspan="3">IVA (19%)</td><td style="text-align:right">${fmt(tax)}</td></tr>
    <tr class="total-row" style="font-size:14px"><td colspan="3"><strong>TOTAL</strong></td><td style="text-align:right"><strong>${fmt(total)}</strong></td></tr>
  </table>
</div>
<div class="footer">
  <p>Rivecor Eco Móvil 360 · Precios referenciales · Válida por 15 días · ${new Date().toLocaleDateString('es-CL')}</p>
</div>
</body></html>`;

    res.setHeader('Content-Type','text/html');
    res.send(html);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { generate, getHTML };
