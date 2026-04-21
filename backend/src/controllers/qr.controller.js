// backend/src/controllers/qr.controller.js
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const prisma = new PrismaClient();

// GET /api/qr/tire/:id  — QR de un neumático individual
const getTireQR = async (req, res) => {
  try {
    const tire = await prisma.tire.findUnique({
      where: { id: req.params.id },
      include: { equipment: { include: { company: { select: { name: true } } } } }
    });
    if (!tire) return res.status(404).json({ error: 'Neumático no encontrado' });

    // URL que apunta al detalle del equipo
    const url = `${process.env.APP_URL || 'http://localhost:5173'}/equipments/${tire.equipmentId}?tire=${tire.id}`;

    const qrDataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#0A0A0A', light: '#FFFFFF' }
    });

    // Responder con HTML imprimible
    const html = buildTireQRCard({ tire, qrDataURL, url });
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/qr/equipment/:id  — QR de todos los neumáticos del equipo
const getEquipmentQRs = async (req, res) => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: req.params.id },
      include: {
        company: { select: { name: true } },
        tires: { where: { isActive: true }, orderBy: { position: 'asc' } }
      }
    });
    if (!equipment) return res.status(404).json({ error: 'Equipo no encontrado' });

    const tiresWithQR = await Promise.all(equipment.tires.map(async tire => {
      const url = `${process.env.APP_URL || 'http://localhost:5173'}/equipments/${equipment.id}?tire=${tire.id}`;
      const qrDataURL = await QRCode.toDataURL(url, { width: 200, margin: 1, color: { dark: '#0A0A0A', light: '#FFFFFF' } });
      return { ...tire, qrDataURL, url };
    }));

    const html = buildEquipmentQRSheet({ equipment, tires: tiresWithQR });
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── HTML para imprimir ──────────────────────────────────────

function buildTireQRCard({ tire, qrDataURL, url }) {
  const statusColor = { OK: '#22C55E', WARNING: '#F59E0B', CRITICAL: '#EF4444' };
  const color = statusColor[tire.status] || '#6B7280';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>QR Neumático ${tire.position}</title>
<style>
  body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
  .card { background: white; border-radius: 12px; padding: 24px; max-width: 320px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 2px solid #e5e7eb; }
  .header { background: #0A0A0A; color: #F5C800; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
  .header h2 { margin: 0; font-size: 16px; letter-spacing: 2px; }
  .header p  { margin: 4px 0 0; font-size: 11px; color: #aaa; }
  .qr img { width: 200px; height: 200px; border: 4px solid #0A0A0A; border-radius: 8px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; color: white; background: ${color}; margin: 12px 0; }
  .info { text-align: left; font-size: 12px; }
  .info tr td:first-child { font-weight: 600; color: #555; padding: 3px 8px 3px 0; }
  .info tr td:last-child  { color: #111; }
  .url { font-size: 9px; color: #9CA3AF; margin-top: 12px; word-break: break-all; }
  @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #ccc; } }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>RIVECOR</h2>
      <p>Eco Móvil 360</p>
    </div>
    <div class="qr"><img src="${qrDataURL}" alt="QR" /></div>
    <div class="status">${tire.status === 'CRITICAL' ? '🔴 CRÍTICO' : tire.status === 'WARNING' ? '🟡 REVISAR' : '🟢 OK'}</div>
    <table class="info">
      <tr><td>Posición</td><td>${tire.position}</td></tr>
      <tr><td>Marca</td><td>${tire.brand || '—'}</td></tr>
      <tr><td>Medida</td><td>${tire.size || '—'}</td></tr>
      ${tire.currentDepth != null ? `<tr><td>Surco</td><td>${tire.currentDepth} mm</td></tr>` : ''}
      ${tire.pressure ? `<tr><td>Presión</td><td>${tire.pressure} PSI</td></tr>` : ''}
      <tr><td>Equipo</td><td>${tire.equipment?.name || '—'}</td></tr>
    </table>
    <p class="url">${url}</p>
    <p style="font-size:10px;color:#9CA3AF;margin-top:8px;">Escanear para ver historial completo</p>
  </div>
</body>
</html>`;
}

function buildEquipmentQRSheet({ equipment, tires }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>QR Neumáticos — ${equipment.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; padding: 24px; background: #f3f4f6; }
  .page-header { background: #0A0A0A; color: #F5C800; padding: 16px 24px; border-radius: 10px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
  .page-header h1 { font-size: 20px; letter-spacing: 2px; }
  .page-header p  { font-size: 12px; color: #aaa; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .card { background: white; border-radius: 10px; padding: 16px; text-align: center; border: 2px solid #e5e7eb; }
  .card img { width: 150px; height: 150px; border: 3px solid #0A0A0A; border-radius: 6px; }
  .pos { font-size: 13px; font-weight: 700; margin: 8px 0 4px; color: #111; }
  .brand { font-size: 11px; color: #666; margin-bottom: 6px; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; color: white; }
  .ok       { background: #22C55E; }
  .warning  { background: #F59E0B; }
  .critical { background: #EF4444; }
  .metrics { font-size: 11px; color: #555; margin-top: 6px; }
  @media print { body { background: white; padding: 10px; } .card { border: 1px solid #ccc; break-inside: avoid; } }
</style>
</head>
<body>
  <div class="page-header">
    <div>
      <h1>RIVECOR — QR Neumáticos</h1>
      <p>${equipment.name} (${equipment.code}) · ${equipment.company?.name || ''}</p>
    </div>
    <div style="text-align:right;">
      <p style="color:#aaa;font-size:11px;">Generado: ${new Date().toLocaleDateString('es-CL')}</p>
      <p style="color:#F5C800;font-size:13px;font-weight:600;">${tires.length} neumáticos</p>
    </div>
  </div>

  <div class="grid">
    ${tires.map(t => `
      <div class="card">
        <img src="${t.qrDataURL}" alt="QR ${t.position}" />
        <div class="pos">${t.position}</div>
        <div class="brand">${t.brand || '—'} · ${t.size || '—'}</div>
        <span class="status ${t.status?.toLowerCase() || 'ok'}">
          ${t.status === 'CRITICAL' ? '🔴 CRÍTICO' : t.status === 'WARNING' ? '🟡 REVISAR' : '🟢 OK'}
        </span>
        <div class="metrics">
          ${t.currentDepth != null ? `Surco: ${t.currentDepth}mm` : ''}
          ${t.pressure ? ` · ${t.pressure} PSI` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
}

module.exports = { getTireQR, getEquipmentQRs };
