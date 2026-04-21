const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function safeParseJSON(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value || {};
  } catch {
    return {};
  }
}

function buildVirtualTiresFromNotes(parsedNotes = {}) {
  const virtualTires = [];

  const tireData = parsedNotes?.tireData || {};
  const extraTires = Array.isArray(parsedNotes?.extraTires)
    ? parsedNotes.extraTires
    : [];

  Object.entries(tireData).forEach(([order, t]) => {
    virtualTires.push({
      id: `virtual_base_${order}`,
      action: 'INSPECTION',
      depthBefore:
        t?.profInicial !== undefined && t?.profInicial !== ''
          ? Number(t.profInicial)
          : null,
      depthAfter:
        t?.profActual !== undefined && t?.profActual !== ''
          ? Number(t.profActual)
          : null,
      pressureBefore: null,
      pressureAfter:
        t?.presion !== undefined && t?.presion !== ''
          ? Number(t.presion)
          : null,
      mileageBefore:
        t?.kmInicial !== undefined && t?.kmInicial !== ''
          ? Number(t.kmInicial)
          : null,
      mileageAfter:
        parsedNotes?.mileage !== undefined && parsedNotes?.mileage !== ''
          ? Number(parsedNotes.mileage)
          : null,
      cost:
        t?.precioCompra !== undefined && t?.precioCompra !== ''
          ? Number(t.precioCompra)
          : 0,
      notes: t?.serial || null,
      tire: {
        position: t?.position || `Orden ${order}`,
        brand: t?.brand || null,
        size: t?.size || null,
      },
    });
  });

  extraTires.forEach((t, index) => {
    virtualTires.push({
      id: `virtual_extra_${index + 1}`,
      action: 'INSPECTION',
      depthBefore:
        t?.profInicial !== undefined && t?.profInicial !== ''
          ? Number(t.profInicial)
          : null,
      depthAfter:
        t?.profActual !== undefined && t?.profActual !== ''
          ? Number(t.profActual)
          : null,
      pressureBefore: null,
      pressureAfter:
        t?.presion !== undefined && t?.presion !== ''
          ? Number(t.presion)
          : null,
      mileageBefore:
        t?.kmInicial !== undefined && t?.kmInicial !== ''
          ? Number(t.kmInicial)
          : null,
      mileageAfter:
        parsedNotes?.mileage !== undefined && parsedNotes?.mileage !== ''
          ? Number(parsedNotes.mileage)
          : null,
      cost:
        t?.precioCompra !== undefined && t?.precioCompra !== ''
          ? Number(t.precioCompra)
          : 0,
      notes: t?.serial || null,
      tire: {
        position: t?.position || `Extra ${index + 1}`,
        brand: t?.brand || null,
        size: t?.size || null,
      },
    });
  });

  return virtualTires;
}

function getMaintenanceRequestModel() {
  return (
    prisma.maintenanceRequest ||
    prisma.maintenanceRequests ||
    prisma.maintenance_request ||
    prisma.maintenance_requests ||
    null
  );
}

function getEquipmentModel() {
  return (
    prisma.equipment ||
    prisma.equipments ||
    prisma.equipment_item ||
    prisma.equipment_items ||
    null
  );
}

function getMechanicModel() {
  return prisma.mechanic || prisma.mechanics || null;
}

function getMaintenanceFormModel() {
  return (
    prisma.maintenanceForm ||
    prisma.maintenanceForms ||
    prisma.maintenance_form ||
    prisma.maintenance_forms ||
    null
  );
}

function getMaintenanceTireFormModel() {
  return (
    prisma.maintenanceTireForm ||
    prisma.maintenanceTireForms ||
    prisma.maintenance_tire_form ||
    prisma.maintenance_tire_forms ||
    null
  );
}

function getTireModel() {
  return prisma.tire || prisma.tires || null;
}

function mapUnitTypeToEquipmentType(unitType) {
  const value = String(unitType || '').trim().toUpperCase();

  if (value === 'CAMION') return 'TRUCK';
  if (value === 'VEHICULO') return 'PICKUP';
  if (value === 'CARGADOR') return 'LOADER';
  if (value === 'EXCAVADORA') return 'EXCAVATOR';
  if (value === 'GRUA') return 'CRANE';
  if (value === 'GRUA HORQUILLA') return 'FORKLIFT';

  return 'OTHER';
}

async function resolveMechanicByUser(userId) {
  if (!userId) return null;

  const Mechanic = getMechanicModel();
  if (!Mechanic) return null;

  return Mechanic.findFirst({
    where: {
      OR: [{ userId }, { id: userId }],
    },
  });
}

function normalizeRequest(request) {
  const assignedMechanic = request?.maintenance_forms?.mechanics || null;

  return {
    ...request,
    licensePlate: request?.equipments?.code || request?.equipments?.name || null,
    unitType: request?.equipments?.type || null,
    mechanic: assignedMechanic
      ? {
          id: assignedMechanic.id,
          name: assignedMechanic.name || 'Mecánico asignado',
          email: assignedMechanic.email || null,
          phone: assignedMechanic.phone || null,
        }
      : null,
  };
}

const createRequest = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    const Equipment = getEquipmentModel();

    if (!MaintenanceRequest) {
      return res.status(500).json({
        error: 'Modelo Prisma de solicitudes no disponible',
      });
    }

    if (!Equipment) {
      return res.status(500).json({
        error: 'Modelo Prisma de equipos no disponible',
      });
    }

    const {
      equipmentId,
      type,
      priority,
      description,
      licensePlate,
      unitType,
      clientUrgency,
    } = req.body;

    let resolvedEquipmentId = equipmentId || null;

    const normalizedLicensePlate = licensePlate
      ? String(licensePlate).trim().toUpperCase()
      : null;

    const normalizedUnitType = unitType
      ? String(unitType).trim().toUpperCase()
      : null;

    if (resolvedEquipmentId) {
      if (req.user.role === 'CLIENT') {
        const eq = await Equipment.findUnique({
          where: { id: resolvedEquipmentId },
          include: { companies: true },
        });

        if (!eq) {
          return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        if (
          req.user.companyId &&
          eq.companies &&
          eq.companies.id !== req.user.companyId
        ) {
          return res.status(403).json({ error: 'Sin acceso al equipo' });
        }
      }
    } else {
      if (!normalizedLicensePlate) {
        return res.status(400).json({
          error: 'licensePlate es requerido cuando no se envía equipmentId',
        });
      }

      if (!normalizedUnitType) {
        return res.status(400).json({
          error: 'unitType es requerido cuando no se envía equipmentId',
        });
      }

      const existingEquipment = await Equipment.findFirst({
        where: {
          OR: [
            { code: normalizedLicensePlate },
            { name: normalizedLicensePlate },
          ],
        },
        include: { companies: true },
      });

      if (
        existingEquipment &&
        (!req.user.companyId ||
          !existingEquipment.companies ||
          existingEquipment.companies.id === req.user.companyId)
      ) {
        resolvedEquipmentId = existingEquipment.id;
      } else {
        if (!req.user.companyId) {
          return res.status(400).json({
            error: 'El cliente no tiene companyId para crear un equipo nuevo',
          });
        }

        const createdEquipment = await Equipment.create({
          data: {
            name: normalizedLicensePlate,
            code: normalizedLicensePlate,
            type: mapUnitTypeToEquipmentType(normalizedUnitType),
            location: 'Pendiente',
            companies: {
              connect: { id: req.user.companyId },
            },
          },
          include: {
            companies: true,
          },
        });

        resolvedEquipmentId = createdEquipment.id;
      }
    }

    if (!resolvedEquipmentId) {
      return res.status(400).json({
        error: 'No se pudo resolver el equipo para crear la solicitud',
      });
    }

    const finalDescriptionParts = [];

    if (description && String(description).trim()) {
      finalDescriptionParts.push(String(description).trim());
    } else {
      finalDescriptionParts.push('Solicitud de mantención');
    }

    if (normalizedLicensePlate) {
      finalDescriptionParts.push(`Patente: ${normalizedLicensePlate}`);
    }

    if (normalizedUnitType) {
      finalDescriptionParts.push(`Tipo unidad: ${normalizedUnitType}`);
    }

    if (clientUrgency && String(clientUrgency).trim()) {
      finalDescriptionParts.push(
        `Urgencia cliente: ${String(clientUrgency).trim()}`
      );
    }

    const created = await MaintenanceRequest.create({
      data: {
        type: type || 'INSPECTION',
        priority: priority || 'NORMAL',
        description: finalDescriptionParts.join('\n'),
        status: 'PENDING',
        users: {
          connect: { id: req.user.id },
        },
        equipments: {
          connect: { id: resolvedEquipmentId },
        },
      },
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

    return res.status(201).json({
      ...normalizeRequest(created),
      clientUrgency: clientUrgency || null,
    });
  } catch (e) {
    console.error('createRequest error:', e);
    return res.status(500).json({ error: e.message });
  }
};

const getRequests = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    const where = {};

    if (req.user.role === 'CLIENT') {
      where.OR = [
        { users: { id: req.user.id } },
        ...(req.user.companyId
          ? [{ equipments: { companies: { id: req.user.companyId } } }]
          : []),
      ];
    }

    if (req.user.role === 'OPERATOR') {
      const mechanic = await resolveMechanicByUser(req.user.id);

      if (!mechanic) {
        return res.status(400).json({
          error: 'No existe ficha de mecánico para este usuario',
        });
      }

      where.OR = [
        { status: 'PENDING' },
        {
          maintenance_forms: {
            is: {
              mechanicId: mechanic.id,
            },
          },
        },
      ];
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const requests = await MaintenanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    res.json(requests.map(normalizeRequest));
  } catch (e) {
    console.error('getRequests error:', e);
    res.status(500).json({ error: e.message });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    const requests = await MaintenanceRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
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

    res.json(requests.map(normalizeRequest));
  } catch (e) {
    console.error('getPendingRequests error:', e);
    res.status(500).json({ error: e.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    const MaintenanceForm = getMaintenanceFormModel();

    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    if (!MaintenanceForm) {
      return res.status(500).json({ error: 'Modelo de formularios no disponible' });
    }

    const mechanic = await resolveMechanicByUser(req.user.id);

    if (!mechanic) {
      return res.status(400).json({
        error: 'No existe ficha de mecánico para este usuario',
      });
    }

    const request = await MaintenanceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        users: true,
        equipments: true,
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'La solicitud ya no está pendiente' });
    }

    const now = new Date();

    await MaintenanceForm.upsert({
      where: { requestId: req.params.id },
      update: {
        mechanicId: mechanic.id,
        equipmentId: request.equipmentId,
        scheduledAt: now,
        updatedAt: now,
      },
      create: {
        requestId: req.params.id,
        mechanicId: mechanic.id,
        equipmentId: request.equipmentId,
        type: request.type,
        plannedType: String(request.type),
        scheduledAt: now,
      },
    });

    const updated = await MaintenanceRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: now,
        updatedAt: now,
      },
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

    res.json(normalizeRequest(updated));
  } catch (e) {
    console.error('acceptRequest error:', e);
    res.status(500).json({ error: e.message });
  }
};

const markRequestEnRoute = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    const MaintenanceForm = getMaintenanceFormModel();

    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    if (!MaintenanceForm) {
      return res.status(500).json({ error: 'Modelo de formularios no disponible' });
    }

    const mechanic = await resolveMechanicByUser(req.user.id);

    if (!mechanic) {
      return res.status(400).json({
        error: 'No existe ficha de mecánico para este usuario',
      });
    }

    const request = await MaintenanceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        maintenance_forms: true,
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (
      request.maintenance_forms &&
      request.maintenance_forms.mechanicId &&
      request.maintenance_forms.mechanicId !== mechanic.id
    ) {
      return res.status(403).json({
        error: 'Esta solicitud pertenece a otro mecánico',
      });
    }

    await MaintenanceForm.upsert({
      where: { requestId: req.params.id },
      update: {
        mechanicId: mechanic.id,
        updatedAt: new Date(),
      },
      create: {
        requestId: req.params.id,
        mechanicId: mechanic.id,
        equipmentId: request.equipmentId,
        plannedType: String(request.type || 'INSPECTION'),
      },
    });

    const updated = await MaintenanceRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
      },
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

    res.json(normalizeRequest(updated));
  } catch (e) {
    console.error('markRequestEnRoute error:', e);
    res.status(500).json({ error: e.message });
  }
};

const completeRequest = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    const MaintenanceForm = getMaintenanceFormModel();

    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    if (!MaintenanceForm) {
      return res.status(500).json({ error: 'Modelo de formularios no disponible' });
    }

    const mechanic = await resolveMechanicByUser(req.user.id);

    if (!mechanic) {
      return res.status(400).json({
        error: 'No existe ficha de mecánico para este usuario',
      });
    }

    const request = await MaintenanceRequest.findUnique({
      where: { id: req.params.id },
      include: {
        maintenance_forms: true,
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (
      request.maintenance_forms &&
      request.maintenance_forms.mechanicId &&
      request.maintenance_forms.mechanicId !== mechanic.id
    ) {
      return res.status(403).json({
        error: 'Esta solicitud pertenece a otro mecánico',
      });
    }

    await MaintenanceForm.upsert({
      where: { requestId: req.params.id },
      update: {
        mechanicId: mechanic.id,
        status: 'COMPLETED',
        performedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        requestId: req.params.id,
        mechanicId: mechanic.id,
        equipmentId: request.equipmentId,
        type: request.type,
        plannedType: String(request.type || 'INSPECTION'),
        status: 'COMPLETED',
        performedAt: new Date(),
      },
    });

    const updated = await MaintenanceRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
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

    res.json(normalizeRequest(updated));
  } catch (e) {
    console.error('completeRequest error:', e);
    res.status(500).json({ error: e.message });
  }
};

const rateRequest = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    const { rating, comment } = req.body;

    if (req.user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Solo clientes pueden evaluar solicitudes' });
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ error: 'Rating inválido' });
    }

    const request = await MaintenanceRequest.findUnique({
      where: { id: req.params.id },
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

    if (request.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Solo puedes evaluar solicitudes completadas' });
    }

    const updated = await MaintenanceRequest.update({
      where: { id: req.params.id },
      data: {
        description: [
          request.description || '',
          `\n\nValoración cliente: ${Number(rating)}/5`,
          comment ? `\nComentario: ${String(comment).trim()}` : '',
        ].join(''),
        updatedAt: new Date(),
      },
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

    res.json({
      message: 'Evaluación guardada correctamente',
      request: normalizeRequest(updated),
    });
  } catch (e) {
    console.error('rateRequest error:', e);
    res.status(500).json({ error: e.message });
  }
};

const getMyRequestHistory = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    if (req.user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Solo clientes pueden consultar este historial' });
    }

    const requests = await MaintenanceRequest.findMany({
      where: {
        OR: [
          { users: { id: req.user.id } },
          ...(req.user.companyId
            ? [{ equipments: { companies: { id: req.user.companyId } } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
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

    const normalized = requests.map((r) => {
      const mechanic = r.maintenance_forms?.mechanics || null;

      return {
        ...r,
        mechanic: mechanic
          ? {
              id: mechanic.id,
              name: mechanic.name || 'Mecánico asignado',
              email: mechanic.email || null,
              phone: mechanic.phone || null,
            }
          : null,
        licensePlate: r?.equipments?.code || r?.equipments?.name || null,
        unitType: r?.equipments?.type || null,
        mechanicLat: r?.maintenance_forms?.mechanics?.location?.lat ?? null,
        mechanicLng: r?.maintenance_forms?.mechanics?.location?.lng ?? null,
      };
    });

    res.json(normalized);
  } catch (e) {
    console.error('getMyRequestHistory error:', e);
    res.status(500).json({ error: e.message });
  }
};

const getMyJobsHistory = async (req, res) => {
  try {
    const MaintenanceForm = getMaintenanceFormModel();
    if (!MaintenanceForm) {
      return res.status(500).json({ error: 'Modelo maintenanceForm no disponible' });
    }

    const mechanic = await resolveMechanicByUser(req.user.id);

    if (!mechanic) {
      return res.status(400).json({ error: 'No existe ficha de mecánico para este usuario' });
    }

    const forms = await MaintenanceForm.findMany({
      where: {
        mechanicId: mechanic.id,
        status: 'COMPLETED',
      },
      orderBy: { performedAt: 'desc' },
      take: 100,
    });

    const normalized = forms.map((form) => {
      const parsedNotes = safeParseJSON(form.notes);

      return {
        ...form,
        tires: buildVirtualTiresFromNotes(parsedNotes),
        observations: form.observations || parsedNotes.observations || '',
        performedAt: form.performedAt || form.createdAt,
      };
    });

    res.json(normalized);
  } catch (e) {
    console.error('getMyJobsHistory error:', e);
    res.status(500).json({ error: e.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const MaintenanceForm = getMaintenanceFormModel();
    if (!MaintenanceForm) {
      return res.status(500).json({ error: 'Modelo maintenanceForm no disponible' });
    }

    const forms = await MaintenanceForm.findMany({
      where: {
        status: 'COMPLETED',
      },
      orderBy: { performedAt: 'desc' },
      take: 50,
    });

    const normalized = forms.map((form) => {
      const parsedNotes = safeParseJSON(form.notes);

      return {
        ...form,
        tires: buildVirtualTiresFromNotes(parsedNotes),
        observations: form.observations || parsedNotes.observations || '',
        performedAt: form.performedAt || form.createdAt,
      };
    });

    res.json(normalized);
  } catch (e) {
    console.error('getHistory error:', e);
    res.status(500).json({ error: e.message });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const MaintenanceRequest = getMaintenanceRequestModel();
    if (!MaintenanceRequest) {
      return res.status(500).json({ error: 'Modelo de solicitudes no disponible' });
    }

    const allowed = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const nextStatus = String(req.body.status || '').trim().toUpperCase();

    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const data = {
      status: nextStatus,
      updatedAt: new Date(),
    };

    if (req.body.scheduledAt) {
      data.scheduledAt = new Date(req.body.scheduledAt);
    }

    const updated = await MaintenanceRequest.update({
      where: { id: req.params.id },
      data,
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

    res.json(normalizeRequest(updated));
  } catch (e) {
    console.error('updateRequestStatus error:', e);
    res.status(500).json({ error: e.message });
  }
};

const createFormPre = async (req, res) => {
  try {
    const MaintenanceForm = getMaintenanceFormModel();
    const Mechanic = getMechanicModel();
    const Tire = getTireModel();
    const MaintenanceTireForm = getMaintenanceTireFormModel();
    const Equipment = getEquipmentModel();
    const MaintenanceRequest = getMaintenanceRequestModel();

    if (!MaintenanceForm || !Equipment) {
      return res.status(500).json({
        error: 'Modelos necesarios para createFormPre no disponibles',
      });
    }

    const { equipmentId, mechanicId, plannedType, notes, requestId } = req.body;

    if (!equipmentId) {
      return res.status(400).json({ error: 'equipmentId es requerido' });
    }

    const equipment = await Equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    let mechanicRecord = null;

    if (mechanicId && Mechanic) {
      mechanicRecord = await Mechanic.findFirst({
        where: {
          OR: [{ id: mechanicId }, { userId: mechanicId }],
        },
      });
    }

    if (!mechanicRecord && req.user?.id && Mechanic) {
      mechanicRecord = await Mechanic.findFirst({
        where: { userId: req.user.id },
      });
    }

    const parsed = safeParseJSON(notes);

    const formRecord = await MaintenanceForm.create({
      data: {
        phase: 'PRE',
        status: 'COMPLETED',
        type: plannedType || 'INSPECTION',
        equipmentId,
        mechanicId: mechanicRecord?.id || null,
        createdById: req.user.id,
        performedAt: new Date(),
        signedByClient: !!parsed.signature,
        observations: parsed.observations || null,
        notes: JSON.stringify(parsed),
      },
    });

    if (Tire && MaintenanceTireForm) {
      const equipmentTires = await Tire.findMany({
        where: { equipmentId, isActive: true },
        select: {
          id: true,
          position: true,
          brand: true,
          size: true,
        },
      });

      const tireData = parsed?.tireData || {};
      const createRows = [];

      Object.entries(tireData).forEach(([order, t]) => {
        const matchedTire =
          equipmentTires.find(
            (x) =>
              x.position &&
              t?.position &&
              x.position.trim().toLowerCase() === t.position.trim().toLowerCase()
          ) || null;

        if (matchedTire) {
          createRows.push({
            maintenanceFormId: formRecord.id,
            tireId: matchedTire.id,
            action: 'INSPECTION',
            depthBefore:
              t?.profInicial !== undefined && t?.profInicial !== ''
                ? Number(t.profInicial)
                : null,
            depthAfter:
              t?.profActual !== undefined && t?.profActual !== ''
                ? Number(t.profActual)
                : null,
            pressureBefore: null,
            pressureAfter:
              t?.presion !== undefined && t?.presion !== ''
                ? Number(t.presion)
                : null,
            mileageBefore:
              t?.kmInicial !== undefined && t?.kmInicial !== ''
                ? Number(t.kmInicial)
                : null,
            mileageAfter:
              parsed?.mileage !== undefined && parsed?.mileage !== ''
                ? Number(parsed.mileage)
                : null,
            cost:
              t?.precioCompra !== undefined && t?.precioCompra !== ''
                ? Number(t.precioCompra)
                : 0,
            notes: t?.serial || null,
          });
        }
      });

      if (createRows.length > 0) {
        await MaintenanceTireForm.createMany({
          data: createRows,
        });
      }
    }

    if (requestId && MaintenanceRequest) {
      await MaintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      });
    }

    const parsedNotes = safeParseJSON(formRecord.notes);

    res.status(201).json({
      ...formRecord,
      tires: buildVirtualTiresFromNotes(parsedNotes),
    });
  } catch (e) {
    console.error('createFormPre error:', e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getPendingRequests,
  acceptRequest,
  markRequestEnRoute,
  completeRequest,
  rateRequest,
  getMyRequestHistory,
  getMyJobsHistory,
  getHistory,
  updateRequestStatus,
  createFormPre,
};