const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { sendEmail, sendWhatsApp } = require('../services/notificationService');
const { sendWeeklySummary } = require('../services/weeklyReportService');

router.use(authenticate, authorize('ADMIN'));

// POST /api/notifications/test — probar email o whatsapp
router.post('/test', async (req, res) => {
  const { type } = req.body;
  try {
    if (type === 'email') {
      await sendEmail({
        to:      process.env.ADMIN_EMAIL || process.env.SMTP_USER,
        subject: '✅ Test Rivecor — Email funcionando',
        html:    `<div style="font-family:Arial;padding:24px;"><h2 style="color:#1E4D8C;">✅ Email configurado correctamente</h2><p>Este es un mensaje de prueba de <strong>Rivecor Eco Móvil 360</strong>.</p><p style="color:#888;font-size:12px;">Enviado el ${new Date().toLocaleString('es-CL')}</p></div>`
      });
      return res.json({ ok: true, message: `Email de prueba enviado a ${process.env.ADMIN_EMAIL || process.env.SMTP_USER}` });
    }
    if (type === 'whatsapp') {
      const ok = await sendWhatsApp({
        to:      process.env.ADMIN_WHATSAPP,
        message: `✅ *RIVECOR* — WhatsApp configurado correctamente\n\nEste es un mensaje de prueba.\n${new Date().toLocaleString('es-CL')}`
      });
      return res.json({ ok, message: ok ? `WhatsApp enviado a ${process.env.ADMIN_WHATSAPP}` : 'Error enviando WhatsApp' });
    }
    if (type === 'weekly') {
      const result = await sendWeeklySummary();
      return res.json(result);
    }
    res.status(400).json({ error: 'Tipo inválido. Usa: email, whatsapp, weekly' });
  } catch (err) {
    console.error('Test notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/weekly', async (req, res) => {
  const result = await sendWeeklySummary();
  res.json(result);
});

module.exports = router;