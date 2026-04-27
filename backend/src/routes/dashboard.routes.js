const r = require("express").Router();

// ⚠️ Import correcto del controller
const dashboardController = require("../controllers/dashboard.controller");

// ⚠️ Middleware auth
const { authenticate } = require("../middleware/auth.middleware");

// 🔒 Todas las rutas requieren login
r.use(authenticate);

// ✅ GET /api/dashboard
r.get("/", async (req, res) => {
  try {
    if (!dashboardController.getDashboard) {
      console.error("❌ getDashboard no está definido");
      return res.status(500).json({
        error: "Controller no configurado correctamente",
      });
    }

    return dashboardController.getDashboard(req, res);
  } catch (error) {
    console.error("❌ Error en ruta /dashboard:", error);
    res.status(500).json({
      error: "Error interno en dashboard",
    });
  }
});

module.exports = r;