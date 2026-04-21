// backend/src/controllers/adminDashboard.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAdminOverview = async (req, res) => {
  try {
    const now  = new Date();
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Ejecutar queries con try/catch individual para que un fallo no rompa todo
    const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };

    const [
      totalCompanies,
      totalEquipments,
      tiresByStatus,
      stockSummary,
      invoicesPending,
      companies,
      criticalTires,
      upcomingMaintenance,
      mechanics,
      inRepair,
    ] = await Promise.all([
      safe(() => prisma.company.count({ where: { isActive: true } }), 0),
      safe(() => prisma.equipment.count({ where: { isActive: true } }), 0),
      safe(() => prisma.tire.groupBy({ by: ['status'], where: { isActive: true }, _count: { status: true } }), []),
      safe(() => prisma.stockTire.groupBy({ by: ['lifecycle'], _count: { lifecycle: true } }), []),
      safe(() => prisma.invoice.aggregate({ where: { status: { in: ['SENT','OVERDUE'] } }, _sum: { total: true }, _count: { id: true } }), { _sum:{ total:0 }, _count:{ id:0 } }),

      safe(() => prisma.company.findMany({
        where: { isActive: true },
        include: {
          equipments: {
            where: { isActive: true },
            include: { tires: { where: { isActive: true, status: { in: ['CRITICAL','WARNING'] } } } }
          },
          contracts: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' }, take: 1 },
          _count: { select: { equipments: true } }
        }
      }), []),

      safe(() => prisma.tire.findMany({
        where: { isActive: true, status: 'CRITICAL' },
        include: { equipment: { include: { company: { select: { name: true } } } } },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }), []),

      safe(() => prisma.maintenanceForm.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { gte: now, lte: in30d } },
        include: {
          equipment: { include: { company: { select: { name: true } } } },
          mechanic:  { select: { name: true } }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10
      }), []),

      safe(() => prisma.mechanic.findMany({
        where: { isActive: true },
        include: { maintenances: { include: { tires: true } } }
      }), []),

      safe(() => prisma.stockTire.findMany({
        where: { lifecycle: 'IN_REPAIR' },
        include: {
          events: { where: { event: 'START_REPAIR' }, orderBy: { performedAt: 'desc' }, take: 1 }
        }
      }), []),
    ]);

    const tireStatus      = tiresByStatus.reduce((a,t) => { a[t.status] = t._count.status; return a; }, {});
    const stockByLifecycle = stockSummary.reduce((a,s) => { a[s.lifecycle] = s._count.lifecycle; return a; }, {});

    const companiesProcessed = companies.map(c => {
      const allTires  = c.equipments.flatMap(eq => eq.tires);
      const critical  = allTires.filter(t => t.status === 'CRITICAL').length;
      const warning   = allTires.filter(t => t.status === 'WARNING').length;
      const overall   = critical > 0 ? 'CRITICAL' : warning > 0 ? 'WARNING' : 'OK';
      return {
        id: c.id, name: c.name, rut: c.rut,
        totalEquipments:   c.equipments.length,
        criticalTires:     critical,
        warningTires:      warning,
        overallStatus:     overall,
        hasActiveContract: c.contracts?.length > 0,
        monthlyValue:      c.contracts?.[0]?.monthlyValue || null
      };
    }).sort((a,b) => ({ CRITICAL:0, WARNING:1, OK:2 }[a.overallStatus]||2) - ({ CRITICAL:0, WARNING:1, OK:2 }[b.overallStatus]||2));

    const mechanicsProcessed = mechanics.map(m => ({
      id: m.id, name: m.name, speciality: m.speciality,
      thisMonth:  m.maintenances?.length || 0,
      tiresWorked: m.maintenances?.reduce((s,mn) => s + (mn.tires?.length||0), 0) || 0,
    })).sort((a,b) => b.thisMonth - a.thisMonth);

    const upcomingProcessed = upcomingMaintenance.map(f => ({
      id: f.id,
      equipmentName: f.equipment?.name,
      companyName:   f.equipment?.company?.name,
      mechanicName:  f.mechanic?.name,
      scheduledAt:   f.scheduledAt,
      daysUntil:     Math.ceil((new Date(f.scheduledAt) - now) / (1000*60*60*24)),
      urgent:        Math.ceil((new Date(f.scheduledAt) - now) / (1000*60*60*24)) <= 3
    }));

    res.json({
      kpis: {
        totalCompanies,
        totalEquipments,
        tiresCritical:   tireStatus.CRITICAL || 0,
        tiresWarning:    tireStatus.WARNING  || 0,
        tiresOk:         tireStatus.OK       || 0,
        stockAvailable:  (stockByLifecycle.NEW_AVAILABLE||0) + (stockByLifecycle.REPAIRED_AVAILABLE||0),
        stockInRepair:   stockByLifecycle.IN_REPAIR || 0,
        invoicesPending: invoicesPending._count?.id    || 0,
        invoicesAmount:  invoicesPending._sum?.total   || 0,
      },
      companies:           companiesProcessed,
      alerts:              criticalTires.map(t => ({
        tireId:       t.id,
        position:     t.position,
        brand:        t.brand,
        size:         t.size,
        equipmentName: t.equipment?.name,
        companyName:   t.equipment?.company?.name,
        depth:         t.currentDepth,
        pressure:      t.pressure,
        equipmentId:   t.equipmentId,
        message:       `${t.equipment?.name} — ${t.position}${t.currentDepth != null ? ` (${t.currentDepth}mm)` : ''}`,
        status:        'CRITICAL',
      })),
      upcomingMaintenance: upcomingProcessed,
      mechanics:           mechanicsProcessed,
      inRepair:            inRepair.map(t => ({
        id:        t.id,
        code:      t.code,
        brand:     t.brand,
        size:      t.size,
        startedAt: t.events?.[0]?.performedAt || null
      })),
    });
  } catch (err) {
    console.error('AdminDashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAdminOverview };