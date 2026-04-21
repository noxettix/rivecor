// backend/src/controllers/calendar.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/calendar?month=3&year=2026
const getCalendar = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const companyId = req.user.role === 'CLIENT' ? req.user.companyId : req.query.companyId;

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    // Mantenciones programadas (PRE) y completadas en el mes
    const forms = await prisma.maintenanceForm.findMany({
      where: {
        ...(companyId ? { equipment: { companyId } } : {}),
        OR: [
          { scheduledAt: { gte: start, lte: end } },
          { performedAt:  { gte: start, lte: end } }
        ]
      },
      include: {
        equipment: { select: { name: true, code: true, location: true } },
        mechanic:  { select: { name: true } }
      }
    });

    // Próximas mantenciones (nextScheduled) del mes
    const upcoming = await prisma.maintenanceForm.findMany({
      where: {
        ...(companyId ? { equipment: { companyId } } : {}),
        nextScheduled: { gte: start, lte: end },
        status: 'COMPLETED'
      },
      include: {
        equipment: { select: { name: true, code: true } }
      }
    });

    // Construir eventos del calendario
    const events = [
      ...forms.map(f => ({
        id:       f.id,
        date:     f.scheduledAt || f.performedAt,
        type:     f.status === 'COMPLETED' ? 'done' : 'scheduled',
        label:    f.equipment?.name,
        sublabel: f.mechanic?.name || 'Sin mecánico',
        status:   f.status,
        location: f.equipment?.location
      })),
      ...upcoming.map(f => ({
        id:       `next_${f.id}`,
        date:     f.nextScheduled,
        type:     'upcoming',
        label:    f.equipment?.name,
        sublabel: 'Próxima mantención',
        status:   'UPCOMING'
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Agrupar por día
    const byDay = {};
    events.forEach(e => {
      const day = new Date(e.date).getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(e);
    });

    res.json({
      month, year,
      daysInMonth: new Date(year, month, 0).getDate(),
      firstDayOfWeek: new Date(year, month - 1, 1).getDay(),
      events, byDay,
      summary: {
        total:     events.length,
        scheduled: events.filter(e => e.type === 'scheduled').length,
        done:      events.filter(e => e.type === 'done').length,
        upcoming:  events.filter(e => e.type === 'upcoming').length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getCalendar };
