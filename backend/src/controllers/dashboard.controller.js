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

function getHealthScore(equipments) {
  if (!equipments.length) return 100;

  const ok = equipments.filter(
    (eq) => computeEquipmentStatus(eq) === "OK"
  ).length;

  return Math.round((ok / equipments.length) * 100);
}

function getUserCompanyId(req) {
  return (
    req.user?.companyId ||
    req.user?.company?.id ||
    req.user?.companies?.id ||
    null
  );
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
            : 100,
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

async function resolveClientCompanyId(req) {
  if (req.user?.companyId) return req.user.companyId;
  if (req.user?.company?.id) return req.user.company.id;

  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (user?.companyId) return user.companyId;
  } catch (e) {
    console.log("No se pudo leer companyId desde users:", e.message);
  }

  try {
    const company = await prisma.companies.findFirst({
      where: {
        users: {
          some: {
            id: req.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (company?.id) return company.id;
  } catch (e) {
    console.log("No se pudo resolver empresa por relación users:", e.message);
  }

  return null;
}

const getClientDashboard = async (req, res) => {
  try {
    const companyId = await resolveClientCompanyId(req);

    console.log("CLIENT DASHBOARD USER:", {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      companyId,
    });

    const whereEquipment = {
      isActive: true,
      ...(companyId
        ? {
            companies: {
              id: companyId,
            },
          }
        : {}),
    };

    const whereRequests = {
      OR: [
        {
          users: {
            id: req.user.id,
          },
        },
        ...(companyId
          ? [
              {
                equipments: {
                  companies: {
                    id: companyId,
                  },
                },
              },
            ]
          : []),
      ],
      status: {
        in: ["PENDING", "ACCEPTED", "EN_ROUTE", "SCHEDULED", "IN_PROGRESS"],
      },
    };

    const [equipments, pendingRequests] = await Promise.all([
      prisma.equipments.findMany({
        where: whereEquipment,
        include: {
          tires: true,
          companies: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.maintenance_requests.count({
        where: whereRequests,
      }),
    ]);

    let totalTires = 0;
    let tiresCritical = 0;
    const alerts = [];

    const mappedEquipments = equipments.map((eq) => {
      const tires = eq.tires || [];

      const criticalTires = tires.filter(
        (t) => t.status === "CRITICAL"
      ).length;

      const warningTires = tires.filter(
        (t) => t.status === "WARNING"
      ).length;

      totalTires += tires.length;
      tiresCritical += criticalTires;

      for (const tire of tires) {
        if (tire.status === "CRITICAL" || tire.status === "WARNING") {
          alerts.push({
            equipment: eq.name,
            code: eq.code,
            tireId: tire.id,
            tirePosition: tire.position,
            message: `${eq.code || eq.name}: neumático ${tire.position} en estado ${tire.status}`,
            status: tire.status,
            level: tire.status,
            depth: tire.currentDepth,
            pressure: tire.pressure,
          });
        }
      }

      return {
        id: eq.id,
        name: eq.name,
        code: eq.code,
        type: eq.type,
        brand: eq.brand,
        model: eq.model,
        location: eq.location,
        company: eq.companies || null,
        healthScore:
          tires.length > 0
            ? Math.round(
                ((tires.length - criticalTires - warningTires * 0.5) /
                  tires.length) *
                  100
              )
            : 100,
        overallStatus: computeEquipmentStatus(eq),
        tiresCount: tires.length,
        criticalTires,
        warningTires,
        tires,
      };
    });

    console.log("CLIENT DASHBOARD RESULT:", {
      companyId,
      equipments: equipments.length,
      totalTires,
      tiresCritical,
      pendingRequests,
    });

    res.json({
      summary: {
        healthScore: getHealthScore(equipments),
        totalEquipments: equipments.length,
        totalTires,
        tiresCritical,
        pendingRequests,
      },
      equipments: mappedEquipments,
      alerts: alerts.slice(0, 10),
    });
  } catch (e) {
    console.error("client dashboard error:", e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getDashboard,
  getClientDashboard,
};