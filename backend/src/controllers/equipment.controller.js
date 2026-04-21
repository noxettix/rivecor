const { prisma } = require('../lib/prisma');

function getEquipmentModel() {
  return prisma.equipment || prisma.equipments || null;
}

function getTiresModel() {
  return prisma.tires || prisma.tire || null;
}

function getCompaniesModel() {
  return prisma.company || prisma.companies || null;
}

function getMaintenanceRequestsModel() {
  return prisma.maintenanceRequests || prisma.maintenance_requests || null;
}

function getTireInspectionsModel() {
  return prisma.inspections || prisma.tire_inspections || null;
}

function noModelError(name) {
  return new Error(`Modelo Prisma no disponible: ${name}`);
}

function buildEquipmentStatus(eq, tires) {
  const criticalTires = tires.filter((t) => t.status === 'CRITICAL').length;
  const warningTires = tires.filter((t) => t.status === 'WARNING').length;

  const overallStatus =
    criticalTires > 0
      ? 'CRITICAL'
      : warningTires > 0
      ? 'WARNING'
      : 'OK';

  return {
    ...eq,
    tires,
    criticalTires,
    warningTires,
    overallStatus,
  };
}

const getAll = async (req, res) => {
  try {
    const Equipment = getEquipmentModel();
    const Tires = getTiresModel();
    const Companies = getCompaniesModel();

    if (!Equipment) throw noModelError('equipment/equipments');
    if (!Tires) throw noModelError('tire/tires');

    const where =
      req.user.role === 'CLIENT'
        ? { companyId: req.user.companyId, isActive: true }
        : { isActive: true };

    const equipments = await Equipment.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(
      equipments.map(async (eq) => {
        const tires = await Tires.findMany({
          where: {
            equipmentId: eq.id,
            isActive: true,
          },
          orderBy: { position: 'asc' },
        });

        let company = null;
        if (Companies && eq.companyId) {
          company = await Companies.findUnique({
            where: { id: eq.companyId },
            select: { id: true, name: true },
          });
        }

        const enriched = buildEquipmentStatus(eq, tires);
        return {
          ...enriched,
          company,
        };
      })
    );

    res.json(result);
  } catch (e) {
    console.error('equipments getAll error:', e);
    res.status(500).json({ error: e.message });
  }
};

const getById = async (req, res) => {
  try {
    const Equipment = getEquipmentModel();
    const Tires = getTiresModel();
    const Companies = getCompaniesModel();
    const MaintenanceRequests = getMaintenanceRequestsModel();
    const TireInspections = getTireInspectionsModel();

    if (!Equipment) throw noModelError('equipment/equipments');
    if (!Tires) throw noModelError('tire/tires');

    const eq = await Equipment.findUnique({
      where: { id: req.params.id },
    });

    if (!eq) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    if (req.user.role === 'CLIENT' && eq.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    const tires = await Tires.findMany({
      where: {
        equipmentId: eq.id,
        isActive: true,
      },
      orderBy: { position: 'asc' },
    });

    const tiresWithInspections = await Promise.all(
      tires.map(async (tire) => {
        let inspections = [];

        if (TireInspections) {
          inspections = await TireInspections.findMany({
            where: { tireId: tire.id },
            take: 3,
            orderBy: { inspectedAt: 'desc' },
          });
        }

        return {
          ...tire,
          inspections,
        };
      })
    );

    let company = null;
    if (Companies && eq.companyId) {
      company = await Companies.findUnique({
        where: { id: eq.companyId },
      });
    }

    let maintenanceRequests = [];
    if (MaintenanceRequests) {
      maintenanceRequests = await MaintenanceRequests.findMany({
        where: { equipmentId: eq.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    }

    const enriched = buildEquipmentStatus(eq, tiresWithInspections);

    res.json({
      ...enriched,
      company,
      maintenanceRequests,
    });
  } catch (e) {
    console.error('equipments getById error:', e);
    res.status(500).json({ error: e.message });
  }
};

const create = async (req, res) => {
  try {
    const Equipment = getEquipmentModel();
    const Companies = getCompaniesModel();

    if (!Equipment) throw noModelError('equipment/equipments');

    const eq = await Equipment.create({
      data: req.body,
    });

    let company = null;
    if (Companies && eq.companyId) {
      company = await Companies.findUnique({
        where: { id: eq.companyId },
      });
    }

    res.status(201).json({
      ...eq,
      company,
      tires: [],
      criticalTires: 0,
      warningTires: 0,
      overallStatus: 'OK',
    });
  } catch (e) {
    console.error('equipments create error:', e);
    res.status(500).json({ error: e.message });
  }
};

const update = async (req, res) => {
  try {
    const Equipment = getEquipmentModel();
    const Companies = getCompaniesModel();
    const Tires = getTiresModel();

    if (!Equipment) throw noModelError('equipment/equipments');

    const eq = await Equipment.update({
      where: { id: req.params.id },
      data: req.body,
    });

    let company = null;
    if (Companies && eq.companyId) {
      company = await Companies.findUnique({
        where: { id: eq.companyId },
      });
    }

    let tires = [];
    if (Tires) {
      tires = await Tires.findMany({
        where: {
          equipmentId: eq.id,
          isActive: true,
        },
        orderBy: { position: 'asc' },
      });
    }

    const enriched = buildEquipmentStatus(eq, tires);

    res.json({
      ...enriched,
      company,
    });
  } catch (e) {
    console.error('equipments update error:', e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
};