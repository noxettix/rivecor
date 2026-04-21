// backend/src/controllers/maintenanceForm.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/maintenance/form/pre — Formulario PRE-visita (planificación)
const createPreVisit = async (req, res) => {
  try {
    const {
      equipmentId, mechanicId, scheduledAt,
      plannedType, plannedTires, notes, contractId
    } = req.body;

    const form = await prisma.maintenanceForm.create({
      data: {
        equipmentId,
        mechanicId,
        contractId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        type: plannedType || 'INSPECTION',
        phase: 'PRE',
        notes,
        plannedTires: plannedTires ? JSON.stringify(plannedTires) : null,
        status: 'SCHEDULED',
        createdById: req.user.id
      },
      include: {
        equipment: { select: { name: true, code: true } },
        mechanic: { select: { name: true } }
      }
    });

    res.status(201).json(form);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/maintenance/form/:id/complete — Formulario POST-visita
const completeVisit = async (req, res) => {
  try {
    const {
      performedAt, observations, mechanicId,
      tiresWorked, nextScheduled, signedByClient
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar formulario
      const form = await tx.maintenanceForm.update({
        where: { id: req.params.id },
        data: {
          performedAt: performedAt ? new Date(performedAt) : new Date(),
          observations,
          mechanicId,
          nextScheduled: nextScheduled ? new Date(nextScheduled) : null,
          signedByClient: signedByClient || false,
          phase: 'POST',
          status: 'COMPLETED'
        }
      });

      // 2. Registrar trabajo en cada neumático
      const tireUpdates = [];
      if (tiresWorked?.length) {
        for (const t of tiresWorked) {
          // Actualizar métricas del neumático
          const newStatus = computeStatus(t.depthAfter, t.pressureAfter, null, null);
          await tx.tire.update({
            where: { id: t.tireId },
            data: {
              currentDepth: t.depthAfter ?? undefined,
              pressure: t.pressureAfter ?? undefined,
              mileage: t.mileageAfter ?? undefined,
              status: newStatus,
              lastInspection: new Date()
            }
          });

          // Registrar inspección
          await tx.tireInspection.create({
            data: {
              tireId: t.tireId,
              depth: t.depthAfter,
              pressure: t.pressureAfter,
              mileage: t.mileageAfter,
              status: newStatus,
              observations: t.observations,
              inspectedBy: mechanicId
            }
          });

          // Registrar en maintenance_tires
          await tx.maintenanceTire.create({
            data: {
              maintenanceFormId: form.id,
              tireId: t.tireId,
              action: t.action,
              depthBefore: t.depthBefore,
              depthAfter: t.depthAfter,
              pressureBefore: t.pressureBefore,
              pressureAfter: t.pressureAfter,
              mileageBefore: t.mileageBefore,
              mileageAfter: t.mileageAfter,
              cost: t.cost,
              notes: t.observations
            }
          });

          tireUpdates.push(t);
        }
      }

      return { form, tireUpdates };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/maintenance/form  — listar formularios
const getForms = async (req, res) => {
  try {
    const where = req.user.role === 'CLIENT'
      ? { equipment: { companyId: req.user.companyId } }
      : {};

    const forms = await prisma.maintenanceForm.findMany({
      where,
      include: {
        equipment: { select: { name: true, code: true } },
        mechanic: { select: { name: true } },
        tires: {
          include: { tire: { select: { position: true, brand: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/maintenance/form/:id
const getForm = async (req, res) => {
  try {
    const form = await prisma.maintenanceForm.findUnique({
      where: { id: req.params.id },
      include: {
        equipment: {
          include: {
            tires: { where: { isActive: true }, orderBy: { position: 'asc' } }
          }
        },
        mechanic: true,
        tires: { include: { tire: true } },
        createdBy: { select: { name: true } }
      }
    });
    if (!form) return res.status(404).json({ error: 'Formulario no encontrado' });
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function computeStatus(depth, pressure, recPressure, mileage) {
  if (depth !== null && depth !== undefined) {
    if (depth < 3) return 'CRITICAL';
    if (depth < 5) return 'WARNING';
  }
  if (pressure && recPressure) {
    const dev = Math.abs(pressure - recPressure) / recPressure;
    if (dev > 0.20) return 'CRITICAL';
    if (dev > 0.10) return 'WARNING';
  }
  return 'OK';
}

module.exports = { createPreVisit, completeVisit, getForms, getForm };
