const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const clientDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.json({
        summary: {
          totalEquipments: 0,
          totalTires: 0,
          tiresOk: 0,
          tiresWarning: 0,
          tiresCritical: 0,
          pendingRequests: 0,
          healthScore: 100,
        },
        equipments: [],
        recentMaintenances: [],
        alerts: [],
      });
    }

    const [equipments, tires, pendingRequests, recentMaintenances] = await Promise.all([
      prisma.equipment.findMany({
        where: {
          companyId,
          isActive: true,
        },
        include: {
          tires: {
            where: { isActive: true },
          },
        },
      }),

      prisma.tire.findMany({
        where: {
          equipment: { companyId },
          isActive: true,
        },
      }),

      prisma.maintenanceRequest.count({
        where: {
          OR: [
            { equipment: { companyId } },
            {
              requestedBy: {
                companyId,
              },
            },
          ],
          status: {
            in: ['PENDING', 'ACCEPTED', 'EN_ROUTE'],
          },
        },
      }),

      prisma.maintenanceForm.findMany({
        where: {
          equipment: { companyId },
          status: 'COMPLETED',
        },
        orderBy: { performedAt: 'desc' },
        take: 5,
        include: {
          equipment: { select: { name: true } },
          mechanic: { select: { name: true } },
        },
      }),
    ]);

    const ok = tires.filter((t) => t.status === 'OK').length;
    const warning = tires.filter((t) => t.status === 'WARNING').length;
    const critical = tires.filter((t) => t.status === 'CRITICAL').length;

    return res.json({
      summary: {
        totalEquipments: equipments.length,
        totalTires: tires.length,
        tiresOk: ok,
        tiresWarning: warning,
        tiresCritical: critical,
        pendingRequests,
        healthScore: tires.length > 0 ? Math.round((ok / tires.length) * 100) : 100,
      },

      equipments: equipments.map((eq) => ({
        ...eq,
        overallStatus: eq.tires.some((t) => t.status === 'CRITICAL')
          ? 'CRITICAL'
          : eq.tires.some((t) => t.status === 'WARNING')
          ? 'WARNING'
          : 'OK',
        criticalTires: eq.tires.filter((t) => t.status === 'CRITICAL').length,
        warningTires: eq.tires.filter((t) => t.status === 'WARNING').length,
      })),

      recentMaintenances,

      alerts: tires
        .filter((t) => t.status !== 'OK')
        .map((t) => ({
          tireId: t.id,
          position: t.position,
          status: t.status,
          message:
            t.status === 'CRITICAL'
              ? `Neumático en ${t.position} requiere atención inmediata`
              : `Neumático en ${t.position} necesita revisión pronto`,
          depth: t.currentDepth,
          pressure: t.pressure,
        }))
        .sort((a, b) => {
          if (a.status === 'CRITICAL' && b.status !== 'CRITICAL') return -1;
          if (a.status !== 'CRITICAL' && b.status === 'CRITICAL') return 1;
          return 0;
        }),
    });
  } catch (e) {
    console.error('clientDashboard error:', e);
    return res.status(500).json({ error: e.message });
  }
};

const adminDashboard = async (req, res) => {
  try {
    const [companies, equipments, tires, pendingRequests] = await Promise.all([
      prisma.company.count({
        where: { isActive: true },
      }),

      prisma.equipment.count({
        where: { isActive: true },
      }),

      prisma.tire.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { status: true },
      }),

      prisma.maintenanceRequest.findMany({
        where: {
          status: {
            in: ['PENDING', 'ACCEPTED', 'EN_ROUTE'],
          },
        },
        include: {
          equipment: {
            include: {
              company: { select: { name: true } },
            },
          },
          requestedBy: { select: { name: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    const byStatus = tires.reduce((acc, t) => {
      acc[t.status] = t._count.status;
      return acc;
    }, {});

    return res.json({
      summary: {
        totalCompanies: companies,
        totalEquipments: equipments,
        totalTires: Object.values(byStatus).reduce((a, b) => a + b, 0),
        ...byStatus,
      },
      pendingRequests,
    });
  } catch (e) {
    console.error('adminDashboard error:', e);
    return res.status(500).json({ error: e.message });
  }
};

module.exports = { clientDashboard, adminDashboard };