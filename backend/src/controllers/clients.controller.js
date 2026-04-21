const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/prisma');
const { sendEmail } = require('../services/notificationService');

// GET /api/clients
const getAll = async (req, res) => {
  try {
    const companies = await prisma.companies.findMany({
      where: { isActive: true },
      include: {
        users: {
          where: { role: 'CLIENT' },
          select: { id: true, name: true, email: true, isActive: true }
        },
        contracts: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1
        },
        _count: {
          select: { equipments: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = await Promise.all(
      companies.map(async (c) => {
        let mechanics = [];
        try {
          const rows = await prisma.mechanic_companies.findMany({
            where: { companyId: c.id },
            include: {
              mechanics: {
                select: { id: true, name: true, speciality: true }
              }
            }
          });
          mechanics = rows.map(r => r.mechanics);
        } catch (e) {
          mechanics = [];
        }

        return { ...c, mechanics };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('clients getAll error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients
const create = async (req, res) => {
  try {
    const {
      companyName,
      rut,
      industry,
      address,
      phone,
      contactName,
      contactEmail,
      userName,
      userEmail,
      userPassword,
      contractMonthlyValue,
      contractStartDate,
      contractEndDate,
      contractNotes,
    } = req.body;

    if (!companyName || !rut || !userName || !userEmail) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: nombre empresa, RUT, nombre usuario, email'
      });
    }

    const normalizedEmail = String(userEmail).trim().toLowerCase();

    const existingCompany = await prisma.companies.findUnique({
      where: { rut }
    });

    if (existingCompany) {
      return res.status(400).json({
        error: `Ya existe una empresa con RUT ${rut}`
      });
    }

    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({
        error: `El email ${normalizedEmail} ya está registrado`
      });
    }

    const password =
      userPassword && userPassword.trim() !== ''
        ? userPassword.trim()
        : generatePassword();

    const hashedPassword = await bcrypt.hash(password, 10);
    const contractN = await nextContractNumber();

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.companies.create({
        data: {
          rut,
          name: companyName,
          industry: industry || null,
          address: address || null,
          phone: phone || null,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
        }
      });

      const user = await tx.users.create({
        data: {
          name: userName,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'CLIENT',
          companyId: company.id,
          isActive: true
        }
      });

      let contract = null;

      if (contractMonthlyValue || contractStartDate) {
        contract = await tx.contracts.create({
          data: {
            number: contractN,
            companyId: company.id,
            startDate: contractStartDate
              ? new Date(contractStartDate)
              : new Date(),
            endDate: contractEndDate
              ? new Date(contractEndDate)
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
            monthlyValue: contractMonthlyValue
              ? parseFloat(contractMonthlyValue)
              : null,
            notes: contractNotes || null,
          }
        });
      }

      return { company, user, contract };
    });

    sendWelcomeEmail({
      to: normalizedEmail,
      clientName: userName,
      companyName,
      email: normalizedEmail,
      password,
    }).catch((e) => {
      console.log('Welcome email error (non-fatal):', e.message);
    });

    res.status(201).json({
      ...result,
      passwordPlain: password,
    });
  } catch (err) {
    console.error('clients create error:', err);
    res.status(500).json({ error: err.message || 'Error creando cliente' });
  }
};

const update = async (req, res) => {
  try {
    const company = await prisma.companies.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(company);
  } catch (err) {
    console.error('clients update error:', err);
    res.status(500).json({ error: err.message });
  }
};

const deactivate = async (req, res) => {
  try {
    const company = await prisma.companies.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          where: { role: 'CLIENT' },
          select: { id: true }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.companies.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });

      for (const user of company.users) {
        await tx.users.update({
          where: { id: user.id },
          data: { isActive: false }
        });
      }
    });

    res.json({ message: 'Empresa desactivada' });
  } catch (err) {
    console.error('clients deactivate error:', err);
    res.status(500).json({ error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const company = await prisma.companies.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          where: { role: 'CLIENT' },
          take: 1
        }
      }
    });

    if (!company?.users?.length) {
      return res.status(404).json({ error: 'Sin usuario cliente' });
    }

    const clientUser = company.users[0];
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: clientUser.id },
      data: { password: hashedPassword }
    });

    sendEmail({
      to: clientUser.email,
      subject: 'Nueva contraseña — Rivecor',
      html: `<p>Hola ${clientUser.name}, tu nueva contraseña es: <strong>${newPassword}</strong></p>`
    }).catch(console.log);

    res.json({
      message: 'Contraseña restablecida',
      newPassword,
      email: clientUser.email
    });
  } catch (err) {
    console.error('clients resetPassword error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Mecánicos asignados ─────────────────────────────────────

const getMechanics = async (req, res) => {
  try {
    let assigned = [];
    let available = [];

    try {
      const rows = await prisma.mechanic_companies.findMany({
        where: { companyId: req.params.id },
        include: { mechanics: true }
      });

      assigned = rows.map(r => r.mechanics);

      const all = await prisma.mechanics.findMany({
        where: { isActive: true }
      });

      available = all.filter(m => !assigned.find(a => a.id === m.id));
    } catch (e) {
      available = await prisma.mechanics.findMany({
        where: { isActive: true }
      });
    }

    res.json({ assigned, available });
  } catch (err) {
    console.error('clients getMechanics error:', err);
    res.status(500).json({ error: err.message });
  }
};

const assignMechanic = async (req, res) => {
  try {
    await prisma.mechanic_companies.upsert({
      where: {
        mechanicId_companyId: {
          mechanicId: req.body.mechanicId,
          companyId: req.params.id
        }
      },
      create: {
        mechanicId: req.body.mechanicId,
        companyId: req.params.id
      },
      update: {}
    });

    res.json({ message: 'Mecánico asignado' });
  } catch (err) {
    console.error('clients assignMechanic error:', err);
    res.status(500).json({ error: err.message });
  }
};

const removeMechanic = async (req, res) => {
  try {
    await prisma.mechanic_companies.delete({
      where: {
        mechanicId_companyId: {
          mechanicId: req.params.mechanicId,
          companyId: req.params.id
        }
      }
    });

    res.json({ message: 'Mecánico removido' });
  } catch (err) {
    console.error('clients removeMechanic error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Helpers ─────────────────────────────────────────────────

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

async function nextContractNumber() {
  const year = new Date().getFullYear();

  const last = await prisma.contracts.findFirst({
    where: {
      number: {
        startsWith: `CON-${year}-`
      }
    },
    orderBy: { number: 'desc' }
  });

  if (!last) return `CON-${year}-001`;

  const num = parseInt(last.number.split('-')[2], 10) + 1;
  return `CON-${year}-${String(num).padStart(3, '0')}`;
}

async function sendWelcomeEmail({ to, clientName, companyName, email, password }) {
  await sendEmail({
    to,
    subject: 'Bienvenido a Rivecor Eco Móvil 360',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#0A0A0A;color:#F5C800;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:20px">RIVECOR</h1>
          <p style="margin:4px 0 0;font-size:11px;color:#aaa">Eco Móvil 360</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
          <h2 style="color:#0A0A0A">¡Bienvenido, ${clientName}!</h2>
          <p>Tu cuenta para <strong>${companyName}</strong> fue creada.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0 0 6px;font-size:12px;color:#555;font-weight:600">Credenciales:</p>
            <p style="margin:3px 0;font-size:13px"><strong>Email:</strong> ${email}</p>
            <p style="margin:3px 0;font-size:16px;font-weight:700;letter-spacing:1px"><strong>Contraseña:</strong> ${password}</p>
          </div>
          <p style="color:#888;font-size:12px">Ingresa en la plataforma con tus credenciales.</p>
        </div>
      </div>
    `
  });
}

module.exports = {
  getAll,
  create,
  update,
  deactivate,
  resetPassword,
  getMechanics,
  assignMechanic,
  removeMechanic
};