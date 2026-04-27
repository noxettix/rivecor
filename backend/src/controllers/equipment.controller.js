const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function getDefaultPositions(type) {
  const t = String(type || "").toUpperCase();

  if (t === "TRUCK") {
    return [
      "DELANTERO IZQ",
      "DELANTERO DER",
      "TRASERO IZQ 1",
      "TRASERO IZQ 2",
      "TRASERO DER 1",
      "TRASERO DER 2",
    ];
  }

  if (t === "LOADER" || t === "EXCAVATOR" || t === "FORKLIFT") {
    return ["DEL IZQ", "DEL DER", "TRA IZQ", "TRA DER"];
  }

  return ["DEL IZQ", "DEL DER", "TRA IZQ", "TRA DER"];
}

function computeEquipmentStatus(equipment) {
  const tires = equipment.tires || [];

  const critical = tires.filter((t) => t.status === "CRITICAL").length;
  const warning = tires.filter((t) => t.status === "WARNING").length;

  if (critical > 0) return "CRITICAL";
  if (warning > 0) return "WARNING";
  return "OK";
}

const getAll = async (req, res) => {
  try {
    const where = {
      isActive: true,
    };

    if (req.user?.role === "CLIENT" && req.user?.companyId) {
      where.companyId = req.user.companyId;
    }

    const equipments = await prisma.equipments.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        companies: true,
        tires: true,
      },
    });

    const data = equipments.map((eq) => ({
      ...eq,
      overallStatus: computeEquipmentStatus(eq),
      tiresCount: eq.tires?.length || 0,
      criticalTires: eq.tires?.filter((t) => t.status === "CRITICAL").length || 0,
      warningTires: eq.tires?.filter((t) => t.status === "WARNING").length || 0,
    }));

    res.json(data);
  } catch (e) {
    console.error("getAll equipments error:", e);
    res.status(500).json({ error: e.message });
  }
};

const getById = async (req, res) => {
  try {
    const equipment = await prisma.equipments.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        companies: true,
        tires: {
          orderBy: {
            position: "asc",
          },
          include: {
            tire_inspections: {
              take: 5,
              orderBy: {
                inspectedAt: "desc",
              },
            },
          },
        },
        maintenance_requests: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!equipment) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    if (
      req.user?.role === "CLIENT" &&
      req.user?.companyId &&
      equipment.companyId !== req.user.companyId
    ) {
      return res.status(403).json({ error: "Sin acceso a este equipo" });
    }

    res.json({
      ...equipment,
      overallStatus: computeEquipmentStatus(equipment),
      tiresCount: equipment.tires?.length || 0,
      criticalTires:
        equipment.tires?.filter((t) => t.status === "CRITICAL").length || 0,
      warningTires:
        equipment.tires?.filter((t) => t.status === "WARNING").length || 0,
    });
  } catch (e) {
    console.error("getById equipment error:", e);
    res.status(500).json({ error: e.message });
  }
};

const create = async (req, res) => {
  try {
    const {
      companyId,
      code,
      name,
      type,
      brand,
      model,
      year,
      licensePlate,
      location,
    } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "companyId es requerido" });
    }

    if (!code || !name || !type) {
      return res.status(400).json({
        error: "code, name y type son requeridos",
      });
    }

    const equipment = await prisma.equipments.create({
      data: {
        companyId,
        code: String(code).trim().toUpperCase(),
        name: String(name).trim(),
        type,
        brand: brand || null,
        model: model || null,
        year: year ? Number(year) : null,
        licensePlate: licensePlate || null,
        location: location || null,
        isActive: true,
      },
    });

    const positions = getDefaultPositions(type);

    await prisma.tires.createMany({
      data: positions.map((position) => ({
        equipmentId: equipment.id,
        position,
        brand: null,
        model: null,
        size: null,
        currentDepth: null,
        initialDepth: null,
        pressure: null,
        recommendedPressure: null,
        purchasePrice: null,
        status: "OK",
        isActive: true,
      })),
    });

    const created = await prisma.equipments.findUnique({
      where: {
        id: equipment.id,
      },
      include: {
        companies: true,
        tires: true,
      },
    });

    res.status(201).json({
      ...created,
      overallStatus: computeEquipmentStatus(created),
      tiresCount: created.tires?.length || 0,
    });
  } catch (e) {
    console.error("create equipment error:", e);
    res.status(500).json({ error: e.message });
  }
};

const update = async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      brand,
      model,
      year,
      licensePlate,
      location,
      isActive,
    } = req.body;

    const existing = await prisma.equipments.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        tires: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    const data = {};

    if (code !== undefined) data.code = String(code).trim().toUpperCase();
    if (name !== undefined) data.name = String(name).trim();
    if (type !== undefined) data.type = type;
    if (brand !== undefined) data.brand = brand || null;
    if (model !== undefined) data.model = model || null;
    if (year !== undefined) data.year = year ? Number(year) : null;
    if (licensePlate !== undefined) data.licensePlate = licensePlate || null;
    if (location !== undefined) data.location = location || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.equipments.update({
      where: {
        id: req.params.id,
      },
      data,
      include: {
        companies: true,
        tires: true,
      },
    });

    res.json({
      ...updated,
      overallStatus: computeEquipmentStatus(updated),
      tiresCount: updated.tires?.length || 0,
    });
  } catch (e) {
    console.error("update equipment error:", e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
};