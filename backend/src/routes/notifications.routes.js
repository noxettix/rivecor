const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { sendEmail, buildBaseEmail } = require("../services/notificationService");
const { sendWeeklySummary } = require("../services/weeklyReportService");

const prisma = new PrismaClient();

router.use(authenticate, authorize("ADMIN"));

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

// GET /api/notifications/summary
router.get("/summary", async (req, res) => {
  try {
    const [all, clients, operators, admins] = await Promise.all([
      prisma.users.count({ where: { isActive: true } }),
      prisma.users.count({ where: { isActive: true, role: "CLIENT" } }),
      prisma.users.count({ where: { isActive: true, role: "OPERATOR" } }),
      prisma.users.count({ where: { isActive: true, role: "ADMIN" } }),
    ]);

    res.json({
      users: {
        all,
        clients,
        operators,
        admins,
      },
      emailConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
    });
  } catch (err) {
    console.error("notifications summary error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/test
router.post("/test", async (req, res) => {
  try {
    const to = req.body.email || process.env.ADMIN_EMAIL || process.env.SMTP_USER;

    if (!to) {
      return res.status(400).json({
        error: "No hay email configurado para prueba",
      });
    }

    await sendEmail({
      to,
      subject: "✅ Test Rivecor — Email funcionando",
      html: buildBaseEmail({
        title: "✅ Email configurado correctamente",
        content: `
          <p>Este es un mensaje de prueba de <strong>Rivecor Eco Móvil 360</strong>.</p>
          <p>Si recibiste este correo, el servicio de email está funcionando correctamente.</p>
        `,
      }),
    });

    res.json({
      ok: true,
      message: `Email de prueba enviado a ${to}`,
    });
  } catch (err) {
    console.error("notifications test error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/broadcast
router.post("/broadcast", async (req, res) => {
  try {
    const { target = "ALL", subject, message } = req.body;

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: "El asunto es obligatorio" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }

    const users = await prisma.users.findMany({
      where: getTargetWhere(target),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const validUsers = users.filter((u) => u.email && u.email.includes("@"));

    if (validUsers.length === 0) {
      return res.status(400).json({
        error: "No hay usuarios con correo válido para este grupo",
      });
    }

    const html = buildBaseEmail({
      title: subject,
      content: `
        <div style="white-space:pre-line;">${String(message)
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</div>
      `,
    });

    const results = await Promise.allSettled(
      validUsers.map((user) =>
        sendEmail({
          to: user.email,
          subject,
          html,
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    res.json({
      ok: true,
      target,
      targetLabel: targetLabel(target),
      total: validUsers.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("notifications broadcast error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/weekly
router.post("/weekly", async (req, res) => {
  try {
    const result = await sendWeeklySummary();
    res.json(result);
  } catch (err) {
    console.error("notifications weekly error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;