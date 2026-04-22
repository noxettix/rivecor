const { prisma } = require('../lib/prisma');
const { getLiveLocation, setLiveLocation } = require('../services/trackingService');

function getRequestModel() {
  return (
    prisma.maintenance_requests ||
    prisma.maintenanceRequests ||
    prisma.maintenancerequests
  );
}

function getMechanicModel() {
  return prisma.mechanics || prisma.mechanic;
}

const getTrackingByRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const MaintenanceRequest = getRequestModel();

    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo maintenance_requests no disponible' });
    }

    const request = await MaintenanceRequest.findUnique({
      where: { id: requestId },
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

    const liveLocation = getLiveLocation(requestId);

    const maintenanceForm = Array.isArray(request.maintenance_forms)
      ? request.maintenance_forms[0]
      : request.maintenance_forms;

    const mechanic = maintenanceForm?.mechanics || null;

    return res.json({
      requestId,
      status: request.status,
      mechanic: mechanic
        ? {
            id: mechanic.id,
            name: mechanic.name || 'Mecánico',
            phone: mechanic.phone || null,
          }
        : null,
      location: liveLocation,
    });
  } catch (e) {
    console.error('getTrackingByRequest error:', e);
    return res.status(500).json({ error: e.message });
  }
};

const updateMechanicLocation = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { lat, lng, heading, speed } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat y lng son obligatorios' });
    }

    const Mechanic = getMechanicModel();
    let mechanicName = 'Mecánico';

    if (Mechanic && req.user?.userId) {
      const mechanic = await Mechanic.findFirst({
        where: { userId: req.user.userId },
      });

      if (mechanic?.name) {
        mechanicName = mechanic.name;
      }
    }

    const payload = {
      requestId: String(requestId),
      mechanicUserId: req.user?.userId || null,
      mechanicName,
      lat: Number(lat),
      lng: Number(lng),
      heading: heading != null ? Number(heading) : null,
      speed: speed != null ? Number(speed) : null,
      updatedAt: new Date().toISOString(),
    };

    setLiveLocation(requestId, payload);

    return res.json({
      ok: true,
      location: payload,
    });
  } catch (e) {
    console.error('updateMechanicLocation error:', e);
    return res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getTrackingByRequest,
  updateMechanicLocation,
};