const { prisma } = require('../lib/prisma');

const getFleet = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const role = String(req.user.role || '').toUpperCase();
    const where = {};

    if (role === 'CLIENT') {
      if (!req.user.companyId) {
        return res.json([]);
      }

      where.companyId = req.user.companyId;
    }

    const equipments = await prisma.equipments.findMany({
      where,
      include: {
        tires: true,
        companies: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const normalized = equipments.map((eq) => {
      const tires = Array.isArray(eq.tires) ? eq.tires : [];

      const critical = tires.filter((t) => t.status === 'CRITICAL').length;
      const warning = tires.filter((t) => t.status === 'WARNING').length;
      const ok = tires.filter((t) => t.status === 'OK').length;
      const total = tires.length || 1;
      const healthScore = Math.round((ok / total) * 100);

      return {
        ...eq,
        stats: {
          totalTires: tires.length,
          critical,
          warning,
          ok,
          healthScore,
        },
      };
    });

    return res.json(normalized);
  } catch (e) {
    console.error('getFleet error:', e);
    return res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getFleet,
};