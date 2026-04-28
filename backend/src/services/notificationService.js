const nodemailer = require("nodemailer");

function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: Number(process.env.SMTP_PORT || 587) === 465,

    // 🔥 FIX CRÍTICO → FORZAR IPV4
    family: 4,

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    tls: {
      rejectUnauthorized: false,
    },
  });
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("⚠ Email no configurado — skipping:", subject);
    return false;
  }

  if (!to) {
    console.log("⚠ Email sin destinatario — skipping:", subject);
    return false;
  }

  try {
    const mailer = getMailer();

    console.log("📡 Verificando conexión SMTP...");
    await mailer.verify();

    console.log("📧 Enviando correo a:", to);

    await mailer.sendMail({
      from: `"Rivecor Eco Móvil 360" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email enviado correctamente a:", to);
    return true;
  } catch (err) {
    console.error("❌ Email error:", err.message);
    throw err;
  }
}

function buildBaseEmail({
  title,
  content,
  buttonText = "Ir al sistema",
  buttonUrl = "https://web.rivecor.com",
}) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

        <div style="background:#0A0A0A;padding:26px;text-align:center;">
          <img 
            src="https://web.rivecor.com/logo.png" 
            alt="Rivecor"
            style="width:140px;max-width:80%;display:block;margin:0 auto 12px;"
          />
          <div style="color:#F5C800;font-size:18px;font-weight:800;">
            RIVECOR ECO MÓVIL 360
          </div>
          <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">
            Gestión inteligente de neumáticos
          </div>
        </div>

        <div style="padding:28px;">
          <h2 style="margin:0 0 14px;color:#111827;font-size:22px;">
            ${title}
          </h2>

          <div style="color:#374151;font-size:14px;line-height:1.7;">
            ${content}
          </div>

          <div style="margin-top:26px;text-align:center;">
            <a 
              href="${buttonUrl}"
              style="display:inline-block;background:#F5C800;color:#000000;padding:12px 22px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:800;"
            >
              ${buttonText}
            </a>
          </div>
        </div>

        <div style="background:#fafafa;border-top:1px solid #e5e7eb;padding:16px 26px;text-align:center;color:#71717a;font-size:12px;">
          © ${new Date().getFullYear()} Rivecor Eco Móvil 360<br/>
          Enviado el ${new Date().toLocaleString("es-CL")}
        </div>
      </div>
    </div>
  `;
}

async function notifyCriticalTire({ tire, equipment, company }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return false;

  const subject = `⚠ Neumático crítico — ${equipment?.name || "Equipo"}`;

  const html = buildBaseEmail({
    title: "⚠ Neumático crítico detectado",
    content: `
      <p><strong>Empresa:</strong> ${company?.name || "—"}</p>
      <p><strong>Equipo:</strong> ${equipment?.name || "—"}</p>
      <p><strong>Posición:</strong> ${tire?.position || "—"}</p>
      <p><strong>Estado:</strong> CRÍTICO</p>
    `,
  });

  return sendEmail({ to: adminEmail, subject, html });
}

async function notifyUpcomingMaintenance({
  equipment,
  company,
  scheduledAt,
  daysUntil,
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return false;

  const subject = `📅 Mantención en ${daysUntil} días — ${equipment?.name || "Equipo"}`;

  const html = buildBaseEmail({
    title: "📅 Recordatorio de mantención",
    content: `
      <p>Existe una mantención próxima programada.</p>
      <p><strong>Empresa:</strong> ${company?.name || "—"}</p>
      <p><strong>Equipo:</strong> ${equipment?.name || "—"}</p>
      <p><strong>Fecha:</strong> ${
        scheduledAt
          ? new Date(scheduledAt).toLocaleDateString("es-CL")
          : "—"
      }</p>
    `,
  });

  return sendEmail({ to: adminEmail, subject, html });
}

module.exports = {
  sendEmail,
  buildBaseEmail,
  notifyCriticalTire,
  notifyUpcomingMaintenance,
};