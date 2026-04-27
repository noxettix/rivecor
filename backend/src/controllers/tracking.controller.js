const { prisma } = require('../lib/prisma');

function getMaintenanceRequestModel() {
  return (
    prisma.maintenance_requests ||
    prisma.maintenanceRequests ||
    prisma.maintenancerequests ||
    prisma.maintenanceRequest
  );
}

function getMechanicsModel() {
  return prisma.mechanics || prisma.mechanic;
}

function pickClientLat(request) {
  return (
    request.clientLat ??
    request.latitude ??
    request.lat ??
    request.locationLat ??
    request.requestLat ??
    request.lastLat ??
    null
  );
}

function pickClientLng(request) {
  return (
    request.clientLng ??
    request.longitude ??
    request.lng ??
    request.locationLng ??
    request.requestLng ??
    request.lastLng ??
    null
  );
}

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, heading, speed } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'Lat y Lng requeridos' });
    }

    const MaintenanceRequest = getMaintenanceRequestModel();

    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    const dataToSave = {
      lastLat: Number(lat),
      lastLng: Number(lng),
      lastUpdate: new Date(),
    };

    if (heading != null) dataToSave.lastHeading = Number(heading);
    if (speed != null) dataToSave.lastSpeed = Number(speed);

    const updated = await MaintenanceRequest.update({
      where: { id },
      data: dataToSave,
    });

    return res.json({
      ok: true,
      requestId: id,
      location: {
        lat: dataToSave.lastLat,
        lng: dataToSave.lastLng,
        heading: dataToSave.lastHeading ?? null,
        speed: dataToSave.lastSpeed ?? null,
        updatedAt: dataToSave.lastUpdate,
      },
      updated,
    });
  } catch (e) {
    console.error('TRACKING UPDATE ERROR:', e);
    return res.status(500).json({ error: e.message || 'Error guardando ubicación' });
  }
};

const getTrackingByRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const MaintenanceRequest = getMaintenanceRequestModel();
    const Mechanics = getMechanicsModel();

    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    const request = await MaintenanceRequest.findUnique({
      where: { id },
      include: {
        users: true,
        equipments: true,
        maintenance_forms: {
          include: {
            mechanics: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const form = Array.isArray(request.maintenance_forms)
      ? request.maintenance_forms[0]
      : request.maintenance_forms;

    let mechanic = form?.mechanics || null;

    if (!mechanic && Mechanics && ['OPERATOR', 'MECHANIC'].includes(req.user?.role)) {
      mechanic = await Mechanics.findFirst({
        where: { userId: req.user.userId || req.user.id },
      });
    }

    const clientLat = pickClientLat(request);
    const clientLng = pickClientLng(request);

    return res.json({
      id: request.id,
      status: request.status,

      mechanic: mechanic
        ? {
            id: mechanic.id,
            name: mechanic.name || 'Mecánico',
            phone: mechanic.phone || null,
            email: mechanic.email || null,
          }
        : null,

      mechanicLat: request.lastLat ?? null,
      mechanicLng: request.lastLng ?? null,
      mechanicHeading: request.lastHeading ?? null,
      mechanicSpeed: request.lastSpeed ?? null,
      lastUpdate: request.lastUpdate ?? null,

      clientLat: clientLat != null ? Number(clientLat) : null,
      clientLng: clientLng != null ? Number(clientLng) : null,

      licensePlate:
        request?.licensePlate ||
        request?.equipments?.licensePlate ||
        request?.equipments?.code ||
        request?.equipments?.name ||
        null,

      unitType:
        request?.unitType ||
        request?.equipments?.type ||
        null,
    });
  } catch (e) {
    console.error('TRACKING GET ERROR:', e);
    return res.status(500).json({ error: e.message || 'Error obteniendo tracking' });
  }
};

module.exports = {
  updateLocation,
  getTrackingByRequest,
};