// backend/src/services/weeklyReportService.js
// Resumen semanal automático por WhatsApp — se ejecuta cada lunes 8 AM
const { PrismaClient } = require('@prisma/client');
const { sendWhatsApp, sendEmail } = require('./notificationService');
const prisma = new PrismaClient();

async function buildWeeklySummary() {
  const now   = new Date();
  const in7d  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [criticalTires, upcomingForms, completedForms, pendingInvoices, inRepair] = await Promise.all([
    prisma.tire.count({ where: { isActive: true, status: 'CRITICAL' } }),
    prisma.maintenanceForm.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { gte: now, lte: in7d } },
      include: { equipment: { include: { company: { select: { name: true } } } } }
    }),
    prisma.maintenanceForm.count({ where: { status: 'COMPLETED', performedAt: { gte: last7, lte: now } } }),
    prisma.invoice.aggregate({ where: { status: { in: ['SENT','OVERDUE'] } }, _sum: { total: true }, _count: { id: true } }),
    prisma.stockTire.count({ where: { lifecycle: 'IN_REPAIR' } }),
  ]);

  return { criticalTires, upcomingForms, completedForms, pendingInvoices, inRepair };
}

async function sendWeeklySummary() {
  try {
    const data = await buildWeeklySummary();
    const { criticalTires, upcomingForms, completedForms, pendingInvoices, inRepair } = data;

    const weekStr = new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long' });

    const msg = `📊 *RIVECOR — Resumen semanal* (${weekStr})\n\n` +
      `${criticalTires > 0 ? `🔴 *${criticalTires} neumático${criticalTires > 1 ? 's' : ''} CRÍTICO${criticalTires > 1 ? 'S'  : ''}* — requieren atención\n` : '✅ Sin neumáticos críticos\n'}` +
      `\n📅 *Esta semana:*\n` +
      upcomingForms.slice(0,5).map(f => `   • ${f.equipment?.name} — ${f.equipment?.company?.name} (${new Date(f.scheduledAt).toLocaleDateString('es-CL', { weekday:'short', day:'numeric' })})`).join('\n') +
      (upcomingForms.length === 0 ? '   Sin mantenciones programadas' : '') +
      `\n\n✅ Semana pasada: ${completedForms} mantención${completedForms !== 1 ? 'es' : ''} completada${completedForms !== 1 ? 's' : ''}` +
      `\n💰 Por cobrar: $${Math.round(pendingInvoices._sum.total || 0).toLocaleString('es-CL')} (${pendingInvoices._count.id} factura${pendingInvoices._count.id !== 1 ? 's' : ''})` +
      (inRepair > 0 ? `\n🔧 En reparación: ${inRepair} neumático${inRepair !== 1 ? 's' : ''}` : '') +
      `\n\nRivecor Eco Móvil 360 🚛`;

    const adminPhone = process.env.ADMIN_WHATSAPP;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (adminPhone) await sendWhatsApp({ to: adminPhone, message: msg });
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `Resumen semanal Rivecor — ${weekStr}`,
        html: msg.replace(/\n/g, '<br>').replace(/\*/g, '<strong>').replace(/<strong>/g, '<strong>').replace(/(<strong>[^<]*)<br>/g, '$1</strong><br>')
      });
    }

    console.log('✅ Resumen semanal enviado');
    return { success: true };
  } catch (err) {
    console.error('Weekly report error:', err.message);
    return { success: false, error: err.message };
  }
}

// Iniciar el cron — lunes a las 8 AM
function startWeeklyReport() {
  const checkAndRun = () => {
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
      sendWeeklySummary();
    }
  };
  // Revisar cada minuto
  setInterval(checkAndRun, 60 * 1000);
  console.log('📅 Resumen semanal programado para lunes 8 AM');
}

module.exports = { sendWeeklySummary, startWeeklyReport };
