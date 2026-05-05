const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.post("/login", ctrl.login);
router.get("/me", authenticate, ctrl.me);

router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);

router.all("/login", (_req, res) => {
  return res.status(405).json({ error: "Método no permitido" });
});

module.exports = router;