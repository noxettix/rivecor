const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function computeEquipmentStatus(equipment) {
  const tires = equipment.tires || [];
  const critical = tires.filter((t) => t.status === "CRITICAL").length;
  const warning = tires.filter((t) => t.status === "WARNING").length;

  if (critical > 0) return "CRITICAL";
  if (warning > 0) return "WARNING";
  return "OK";
}

const getDashboard = async (req, res) => {
  try {
    const [
      equipments,
      mechanics,
      companies,
      users,
      stockTires,
      maintenanceRequests,
    ] = await Promise.all([
      prisma.equipments.findMany({
        where: { isActive: true },
        include: {
          tires: true,
          companies: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.mechanics.findMany({
        where: { isActive: true },
        include: {
          maintenances: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.companies.findMany({
        where: { isActive: true },
        include: {
          equipments: true,
          users: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.users.findMany({
        where: { isActive: true },
      }),

      prisma.stock_tires.findMany({
        orderBy: { createdAt: "desc" },
      }),

      prisma.maintenance_requests.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          equipments: true,
          users: true,
        },
      }),
    ]);

    let ok = 0;
    let warning = 0;
    let critical = 0;

    const alerts = [];

    for (const eq of equipments) {
      const status = computeEquipmentStatus(eq);

      if (status === "CRITICAL") critical++;
      else if (status === "WARNING") warning++;
      else ok++;

      for (const tire of eq.tires || []) {
        if (tire.status === "CRITICAL" || tire.status === "WARNING") {
          alerts.push({
            equipment: eq.name,
            code: eq.code,
            tireId: tire.id,
            tirePosition: tire.position,
            message: `${eq.code || eq.name}: neumático ${tire.position} en estado ${tire.status}`,
            level: tire.status,
            status: tire.status,
          });
        }
      }
    }

    const stockSummary = {
      total: stockTires.length,
      newAvailable: stockTires.filter((t) => t.lifecycle === "NEW_AVAILABLE").length,
      installed: stockTires.filter((t) => t.lifecycle === "INSTALLED").length,
      withdrawn: stockTires.filter((t) => t.lifecycle === "WITHDRAWN").length,
      inRepair: stockTires.filter((t) => t.lifecycle === "IN_REPAIR").length,
      repairedAvailable: stockTires.filter((t) => t.lifecycle === "REPAIRED_AVAILABLE").length,
      scrapped: stockTires.filter((t) => t.lifecycle === "SCRAPPED").length,
      availableTotal: stockTires.filter((t) =>
        ["NEW_AVAILABLE", "REPAIRED_AVAILABLE"].includes(t.lifecycle)
      ).length,
    };

    const topEquipments = equipments
      .map((eq) => ({
        id: eq.id,
        name: eq.name,
        code: eq.code,
        critical: (eq.tires || []).filter((t) => t.status === "CRITICAL").length,
        warning: (eq.tires || []).filter((t) => t.status === "WARNING").length,
        tiresCount: (eq.tires || []).length,
      }))
      .sort((a, b) => b.critical - a.critical || b.warning - a.warning)
      .slice(0, 5);

    const recentMaintenances = maintenanceRequests.map((m) => ({
      id: m.id,
      status: m.status,
      type: m.type,
      description: m.description,
      createdAt: m.createdAt,
      equipmentName: m.equipments?.name || m.equipments?.code || "Equipo",
      clientName: m.users?.name || "Cliente",
    }));

    res.json({
      summary: {
        total: equipments.length,
        ok,
        warning,
        critical,
        healthScore:
          equipments.length > 0
            ? Math.round((ok / equipments.length) * 100)
            : 0,
      },

      admin: {
        equipments: equipments.length,
        mechanics: mechanics.length,
        clients: companies.length,
        users: users.length,
        stockAvailable: stockSummary.availableTotal,
        stockTotal: stockSummary.total,
      },

      clients: companies.map((c) => ({
        ...c,
        _count: {
          equipments: c.equipments?.length || 0,
          users: c.users?.length || 0,
        },
      })),

      mechanics: mechanics.map((m) => ({
        ...m,
        _count: {
          maintenances: m.maintenances?.length || 0,
        },
      })),

      equipments: equipments.map((eq) => {
        const criticalTires = (eq.tires || []).filter(
          (t) => t.status === "CRITICAL"
        ).length;

        const warningTires = (eq.tires || []).filter(
          (t) => t.status === "WARNING"
        ).length;

        return {
          ...eq,
          overallStatus: computeEquipmentStatus(eq),
          tiresCount: eq.tires?.length || 0,
          criticalTires,
          warningTires,
        };
      }),

      stock: {
        tires: stockTires,
        summary: stockSummary,
      },

      topEquipments,
      alerts: alerts.slice(0, 10),
      recentMaintenances,
    });
  } catch (e) {
    console.error("dashboard error:", e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getDashboard };