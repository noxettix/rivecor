const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/prisma');

function getMechanicsModel() {
  return prisma.mechanics || prisma.mechanic || null;
}

function getUsersModel() {
  return prisma.users || prisma.user || null;
}

function getMaintenanceFormModel() {
  return prisma.maintenanceForm || prisma.maintenance_forms || null;
}

function getMechanicCompaniesModel() {
  return prisma.mechanic_companies || prisma.mechanicCompanies || null;
}

function getCompaniesModel() {
  return prisma.companies || prisma.company || null;
}

function safeParseJSON(value) {
  try {
    if (!value) return {};
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return {};
  }
}

function noModelError(name) {
  return new Error(`Modelo Prisma no disponible: ${name}`);
}

function inferChangeCount(form) {
  const type = String(form?.type || '').toUpperCase();
  if (
    type.includes('CHANGE') ||
    type.includes('CAMBIO') ||
    type.includes('REPLACE') ||
    type.includes('REEMPLAZO')
  ) {
    return 1;
  }
  return 0;
}

function inferAlignmentCount(form) {
  const notes = safeParseJSON(form?.notes);
  return notes?.alignmentChecked ? 1 : 0;
}

function inferBalancingCount(form) {
  const notes = safeParseJSON(form?.notes);
  return notes?.balancingChecked ? 1 : 0;
}

async function enrichMechanic(m) {
  const Users = getUsersModel();
  const MaintenanceForms = getMaintenanceFormModel();
  const MechanicCompanies = getMechanicCompaniesModel();
  const Companies = getCompaniesModel();

  let user = null;
  let companies = [];
  let forms = [];

  if (Users && m.userId) {
    user = await Users.findUnique({
      where: { id: m.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        name: true,
      },
    });
  }

  if (MechanicCompanies) {
    const rels = await MechanicCompanies.findMany({
      where: { mechanicId: m.id },
    });

    if (Companies && rels.length > 0) {
      companies = await Promise.all(
        rels.map(async (rel) => {
          const company = await Companies.findUnique({
            where: { id: rel.companyId },
            select: { id: true, name: true },
          });
          return company;
        })
      );
      companies = companies.filter(Boolean);
    }
  }

  if (MaintenanceForms) {
    forms = await MaintenanceForms.findMany({
      where: {
        mechanicId: m.id,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        type: true,
        notes: true,
        performedAt: true,
        createdAt: true,
      },
      orderBy: { performedAt: 'desc' },
    });
  }

  const completedJobs = forms.length;
  const changes = forms.reduce((sum, f) => sum + inferChangeCount(f), 0);
  const alignments = forms.reduce((sum, f) => sum + inferAlignmentCount(f), 0);
  const balances = forms.reduce((sum, f) => sum + inferBalancingCount(f), 0);

  return {
    ...m,
    user,
    companies,
    metrics: {
      completedJobs,
      changes,
      alignments,
      balances,
    },
  };
}

// GET /api/mechanics
const getAll = async (req, res) => {
  try {
    const Mechanics = getMechanicsModel();
    if (!Mechanics) throw noModelError('mechanics/mechanic');

    const mechanics = await Mechanics.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(mechanics.map(enrichMechanic));
    res.json(result);
  } catch (e) {
    console.error('mechanics getAll error:', e);
    res.status(500).json({ error: e.message });
  }
};

// GET /api/mechanics/:id
const getById = async (req, res) => {
  try {
    const Mechanics = getMechanicsModel();
    if (!Mechanics) throw noModelError('mechanics/mechanic');

    const mechanic = await Mechanics.findUnique({
      where: { id: req.params.id },
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mecánico no encontrado' });
    }

    const result = await enrichMechanic(mechanic);
    res.json(result);
  } catch (e) {
    console.error('mechanics getById error:', e);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/mechanics
const create = async (req, res) => {
  try {
    const Mechanics = getMechanicsModel();
    const Users = getUsersModel();

    if (!Mechanics) throw noModelError('mechanics/mechanic');
    if (!Users) throw noModelError('users/user');

    const {
      name,
      rut,
      phone,
      email,
      speciality,
      certifications,
      notes,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y password son obligatorios' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const exists = await Users.findUnique({
      where: { email: normalizedEmail },
    });

    if (exists) {
      return res.status(400).json({ error: 'El email ya existe' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const usersModel = tx.users || tx.user;
      const mechanicsModel = tx.mechanics || tx.mechanic;

      if (!usersModel || !mechanicsModel) {
        throw new Error('Modelos Prisma no disponibles dentro de la transacción');
      }

      const user = await usersModel.create({
        data: {
          email: normalizedEmail,
          password: hashed,
          name,
          role: 'OPERATOR',
          isActive: true,
        },
      });

      const mechanic = await mechanicsModel.create({
        data: {
          name,
          rut: rut || null,
          phone: phone || null,
          email: normalizedEmail,
          speciality: speciality || null,
          certifications: certifications || null,
          notes: notes || null,
          userId: user.id,
          isActive: true,
        },
      });

      return { user, mechanic };
    });

    res.status(201).json({
      ...result,
      passwordPlain: password,
    });
  } catch (e) {
    console.error('mechanics create error:', e);
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/mechanics/:id
const update = async (req, res) => {
  try {
    const Mechanics = getMechanicsModel();
    const Users = getUsersModel();

    if (!Mechanics) throw noModelError('mechanics/mechanic');

    const current = await Mechanics.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ error: 'Mecánico no encontrado' });
    }

    const {
      name,
      rut,
      phone,
      email,
      speciality,
      certifications,
      notes,
      isActive,
    } = req.body;

    let normalizedEmail = current.email;
    if (email) {
      normalizedEmail = String(email).trim().toLowerCase();

      if (Users && normalizedEmail !== current.email) {
        const exists = await Users.findUnique({
          where: { email: normalizedEmail },
        });

        if (exists && exists.id !== current.userId) {
          return res.status(400).json({ error: 'El email ya existe' });
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const mechanicsModel = tx.mechanics || tx.mechanic;
      const usersModel = tx.users || tx.user;

      const mechanic = await mechanicsModel.update({
        where: { id: req.params.id },
        data: {
          name: name ?? current.name,
          rut: rut ?? current.rut,
          phone: phone ?? current.phone,
          email: normalizedEmail,
          speciality: speciality ?? current.speciality,
          certifications: certifications ?? current.certifications,
          notes: notes ?? current.notes,
          isActive: typeof isActive === 'boolean' ? isActive : current.isActive,
        },
      });

      if (usersModel && current.userId) {
        await usersModel.update({
          where: { id: current.userId },
          data: {
            name: name ?? current.name,
            email: normalizedEmail,
            isActive: typeof isActive === 'boolean' ? isActive : true,
          },
        });
      }

      return mechanic;
    });

    const result = await enrichMechanic(updated);
    res.json(result);
  } catch (e) {
    console.error('mechanics update error:', e);
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/mechanics/:id
const deactivate = async (req, res) => {
  try {
    const Mechanics = getMechanicsModel();
    const Users = getUsersModel();

    if (!Mechanics) throw noModelError('mechanics/mechanic');

    const current = await Mechanics.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ error: 'Mecánico no encontrado' });
    }

    await prisma.$transaction(async (tx) => {
      const mechanicsModel = tx.mechanics || tx.mechanic;
      const usersModel = tx.users || tx.user;

      await mechanicsModel.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      if (usersModel && current.userId) {
        await usersModel.update({
          where: { id: current.userId },
          data: { isActive: false },
        });
      }
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('mechanics deactivate error:', e);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/mechanics/:id/reset-password
const resetPassword = async (req, res) => {
  try {
    const Mechanics = getMechanicsModel();
    const Users = getUsersModel();

    if (!Mechanics) throw noModelError('mechanics/mechanic');
    if (!Users) throw noModelError('users/user');

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password requerido' });
    }

    const mechanic = await Mechanics.findUnique({
      where: { id: req.params.id },
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mecánico no encontrado' });
    }

    if (!mechanic.userId) {
      return res.status(400).json({ error: 'El mecánico no tiene usuario asociado' });
    }

    const user = await Users.findUnique({
      where: { id: mechanic.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario asociado no encontrado' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await Users.update({
      where: { id: mechanic.userId },
      data: { password: hashed },
    });

    res.json({
      ok: true,
      email: user.email,
      newPassword: password,
    });
  } catch (e) {
    console.error('mechanics resetPassword error:', e);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/mechanics/:id/assign-company
const assignCompany = async (req, res) => {
  try {
    const MechanicCompanies = getMechanicCompaniesModel();

    if (!MechanicCompanies) {
      return res.status(400).json({ error: 'No existe relación mechanic_companies en la BD' });
    }

    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId es obligatorio' });
    }

    const rel = await MechanicCompanies.create({
      data: {
        mechanicId: req.params.id,
        companyId,
      },
    });

    res.json(rel);
  } catch (e) {
    console.error('assignCompany error:', e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deactivate,
  resetPassword,
  assignCompany,
};