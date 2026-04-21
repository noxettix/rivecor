const r = require('express').Router();
const { prisma } = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth.middleware');

r.use(authenticate);

r.get('/', authorize('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const c = await prisma.companies.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            equipments: true,
            users: true,
          },
        },
      },
    });

    res.json(c);
  } catch (e) {
    console.error('companies getAll error:', e);
    res.status(500).json({ error: e.message });
  }
});

r.get('/:id', async (req, res) => {
  try {
    const c = await prisma.companies.findUnique({
      where: { id: req.params.id },
      include: {
        equipments: {
          where: { isActive: true },
        },
        contracts: true,
      },
    });

    if (!c) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    res.json(c);
  } catch (e) {
    console.error('companies getById error:', e);
    res.status(500).json({ error: e.message });
  }
});

r.post('/', authorize('ADMIN'), async (req, res) => {
  try {
    const created = await prisma.companies.create({
      data: req.body,
    });

    res.status(201).json(created);
  } catch (e) {
    console.error('companies create error:', e);
    res.status(500).json({ error: e.message });
  }
});

r.put('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const updated = await prisma.companies.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(updated);
  } catch (e) {
    console.error('companies update error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = r;