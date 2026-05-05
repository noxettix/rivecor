const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma } = require("../lib/prisma");

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, resetPasswordTokenHash, resetPasswordExpiresAt, ...safe } = user;
  return safe;
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    return res.json({
      token: signToken(user),
      user: sanitizeUser(user),
    });
  } catch (e) {
    console.error("login error:", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const me = async (req, res) => {
  res.json(sanitizeUser(req.user));
};

const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      return res.json({ message: "OK" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    await prisma.users.update({
      where: { id: user.id },
      data: {
        resetPasswordTokenHash: hashResetToken(rawToken),
        resetPasswordExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    console.log("TOKEN RESET:", rawToken);

    return res.json({
      message: "Token generado",
      resetToken: rawToken, // demo
    });
  } catch (e) {
    console.error("forgot error:", e);
    res.status(500).json({ error: "Error interno" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.users.findFirst({
      where: {
        resetPasswordTokenHash: hashResetToken(token),
        resetPasswordExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
    });

    res.json({ message: "Contraseña actualizada" });
  } catch (e) {
    console.error("reset error:", e);
    res.status(500).json({ error: "Error interno" });
  }
};

module.exports = {
  login,
  me,
  forgotPassword,
  resetPassword,
};