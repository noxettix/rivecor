const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const prisma = new PrismaClient();

router.use(authenticate, authorize("ADMIN"));

function getUsersModel() {
  return prisma.users || prisma.user || null;
}

function getTargetWhere(target) {
  const base = {
    isActive: true,
    email: {
      not: "",
    },
  };

  if (!target || target === "ALL") return base;

  if (target === "CLIENT") {
    return {
      ...base,
      role: "CLIENT",
    };
  }

  if (target === "OPERATOR") {
    return {
      ...base,
      role: "OPERATOR",
    };
  }

  if (target === "ADMIN") {
    return {
      ...base,
      role: "ADMIN",
    };
  }

  return base;
}

function targetLabel(target) {
  switch (target) {
    case "CLIENT":
      return "Clientes";
    case "OPERATOR":
      return "Mecánicos / Operadores";
    case "ADMIN":
      return "Administradores";
    default:
      return "Todos los usuarios";
  }
}

// 🔥 ENDPOINT NUEVO (CLAVE)
router.get("/emails", async (req, res) => {
  try {
    const Users = getUsersModel();

    if (!Users) {
      return res.status(500).json({
        error: "Modelo users/user no disponible",
      });
    }

    const { target = "ALL" } = req.query;

    const users = await Users.findMany({
      where: getTargetWhere(target),
      select: {
        email: true,
      },
    });

    const emails = users
      .map((u) => u.email)
      .filter((e) => e && e.includes("@"));

    console.log("📧 Emails encontrados:", emails.length);

    res.json({
      ok: true,
      total: emails.length,
      emails,
    });
  } catch (err) {
    console.error("❌ Error obteniendo emails:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});

// 🔧 OPCIONAL: para probar rápido
router.get("/ping", (req, res) => {
  res.json({
    ok: true,
    message: "notifications funcionando",
  });
});

module.exports = router;