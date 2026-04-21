const nodemailer = require('nodemailer');

function getMailer() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,   // funciona con espacios, nodemailer los maneja
    },
    tls: { rejectUnauthorized: false }
  });
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠ Email no configurado — skipping:', subject);
    return false;
  }
  try {
    const mailer = getMailer();
    // Verificar conexión antes de enviar
    await mailer.verify();
    await mailer.sendMail({
      from: `"Rivecor Eco Móvil 360" <${process.env.SMTP_USER}>`,
      to, subject, html
    });
    console.log('📧 Email enviado a:', to);
    return true;
  } catch (err) {
    console.error('Email error:', err.message);
    throw err;  // propagar para que el caller sepa que falló
  }
}

async function sendWhatsApp({ to, message }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('⚠ WhatsApp no configurado');
    return false;
  }
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'}`,
      to:   `whatsapp:${to}`,
      body: message
    });
    console.log('📱 WhatsApp enviado a:', to);
    return true;
  } catch (err) {
    console.error('WhatsApp error:', err.message);
    return false;
  }
}

async function notifyCriticalTire({ tire, equipment, company }) {
  const subject = `⚠ Neumático CRÍTICO — ${equipment.name} (${company.name})`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0A0A0A;padding:20px;border-radius:8px 8px 0 0;">
        <h1 style="color:#F5C800;margin:0;font-size:20px;">RIVECOR ECO MÓVIL 360</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin-bottom:20px;">
          <h2 style="color:#DC2626;margin:0 0 8px;">🔴 Neumático en estado CRÍTICO</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Empresa</td><td style="padding:8px;">${company.name}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Equipo</td><td style="padding:8px;">${equipment.name}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Posición</td><td style="padding:8px;">${tire.position}</td></tr>
          ${tire.currentDepth != null ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;">Surco</td><td style="padding:8px;color:#DC2626;font-weight:600;">${tire.currentDepth} mm</td></tr>` : ''}
        </table>
      </div>
    </div>`;

  const whatsappMsg = `🔴 *RIVECOR - Alerta Crítica*\n\n⚠ Neumático CRÍTICO\n*Empresa:* ${company.name}\n*Equipo:* ${equipment.name}\n*Posición:* ${tire.position}${tire.currentDepth != null ? `\n*Surco:* ${tire.currentDepth}mm` : ''}`;

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const adminPhone = process.env.ADMIN_WHATSAPP;

  await Promise.allSettled([
    adminEmail ? sendEmail({ to: adminEmail, subject, html }) : Promise.resolve(),
    adminPhone ? sendWhatsApp({ to: adminPhone, message: whatsappMsg }) : Promise.resolve(),
  ]);
}

async function notifyUpcomingMaintenance({ equipment, company, scheduledAt, daysUntil }) {
  const subject = `📅 Mantención en ${daysUntil} días — ${equipment.name}`;
  const html = `<div style="font-family:Arial;padding:24px;"><h2>📅 Recordatorio de mantención</h2><p><strong>${equipment.name}</strong> — ${company.name}</p><p>Programada para: <strong>${new Date(scheduledAt).toLocaleDateString('es-CL')}</strong></p></div>`;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (adminEmail) await sendEmail({ to: adminEmail, subject, html }).catch(console.error);
}

module.exports = { sendEmail, sendWhatsApp, notifyCriticalTire, notifyUpcomingMaintenance };