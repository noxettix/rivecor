const { prisma } = require('../lib/prisma');

const clientDashboard = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const role = String(req.user.role || '').toUpperCase();

    if (!['CLIENT', 'ADMIN', 'OPERATOR'].includes(role)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    const companyId = req.user.companyId || null;

    if (!companyId && role === 'CLIENT') {
      return res.json({
        summary: {
          totalEquipments: 0,
          totalTires: 0,
          critical: 0,
          warning: 0,
          ok: 0,
          healthScore: 0,
        },
        equipments: [],
        alerts: [],
        recentMaintenances: [],
      });
    }

    const whereEquipments = companyId ? { companyId } : {};

    const equipments = await prisma.equipments.findMany({
      where: whereEquipments,
      include: {
        tires: true,
        companies: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const allTires = equipments.flatMap((eq) => eq.tires || []);

    const critical = allTires.filter((t) => t.status === 'CRITICAL').length;
    const warning = allTires.filter((t) => t.status === 'WARNING').length;
    const ok = allTires.filter((t) => t.status === 'OK').length;
    const totalTires = allTires.length;
    const healthScore = totalTires ? Math.round((ok / totalTires) * 100) : 0;

    const alerts = allTires
      .filter((t) => t.status === 'CRITICAL' || t.status === 'WARNING')
      .map((t) => ({
        id: t.id,
        tireId: t.id,
        equipmentId: t.equipmentId,
        status: t.status,
        position: t.position,
        brand: t.brand,
        size: t.size,
        pressure: t.pressure,
        currentDepth: t.currentDepth,
      }));

    const recentMaintenances = await prisma.maintenance_requests.findMany({
      where: companyId
        ? {
            equipments: {
              companyId,
            },
          }
        : {},
      include: {
        equipments: true,
        maintenance_forms: {
          include: {
            mechanics: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return res.json({
      summary: {
        totalEquipments: equipments.length,
        totalTires,
        critical,
        warning,
        ok,
        healthScore,
      },
      equipments,
      alerts,
      recentMaintenances,
    });
  } catch (e) {
    console.error('clientDashboard error:', e);
    return res.status(500).json({ error: e.message });
  }
};

const adminDashboard = async (req, res) => {
  try {
    const equipments = await prisma.equipments.findMany({
      include: {
        tires: true,
        companies: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const allTires = equipments.flatMap((eq) => eq.tires || []);

    const critical = allTires.filter((t) => t.status === 'CRITICAL').length;
    const warning = allTires.filter((t) => t.status === 'WARNING').length;
    const ok = allTires.filter((t) => t.status === 'OK').length;
    const totalTires = allTires.length;
    const healthScore = totalTires ? Math.round((ok / totalTires) * 100) : 0;

    const recentMaintenances = await prisma.maintenance_requests.findMany({
      include: {
        equipments: true,
        users: true,
        maintenance_forms: {
          include: {
            mechanics: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return res.json({
      summary: {
        totalEquipments: equipments.length,
        totalTires,
        critical,
        warning,
        ok,
        healthScore,
      },
      equipments,
      recentMaintenances,
    });
  } catch (e) {
    console.error('adminDashboard error:', e);
    return res.status(500).json({ error: e.message });
  }
};

module.exports = {
  clientDashboard,
  adminDashboard,
};