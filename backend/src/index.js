require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://premonarchical-nonpreferable-sarina.ngrok-free.dev/api'],
  credentials: true,
}));

app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'Rivecor Ultimate API' });
});

// ─── Rutas core ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/companies', require('./routes/company.routes'));
app.use('/api/equipments', require('./routes/equipment.routes'));
app.use('/api/tires', require('./routes/tire.routes'));
app.use('/api/maintenance', require('./routes/maintenance.routes'));
app.use('/api/maintenance/form', require('./routes/maintenanceForm.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/mechanics', require('./routes/mechanic.routes'));
app.use('/api/costs', require('./routes/cost.routes'));
app.use('/api/reports', require('./routes/reports.routes'));

// ─── Módulos nuevos ──────────────────────────────────────────
app.use('/api/stock', require('./routes/stock.routes'));
app.use('/api/qr', require('./routes/qr.routes'));
app.use('/api/rep', require('./routes/rep.routes'));
app.use('/api/calendar', require('./routes/calendar.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/quotes', require('./routes/quote.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/clients', require('./routes/clients.routes'));

// ─── Catálogo de neumáticos ──────────────────────────────────
app.use('/api', require('./routes/tireCatalog.routes'));

// ─── Dashboard admin overview ────────────────────────────────
const { getAdminOverview } = require('./controllers/adminDashboard.controller');
const { authenticate, authorize } = require('./middleware/auth.middleware');

app.get(
  '/api/dashboard/admin-overview',
  authenticate,
  authorize('ADMIN', 'OPERATOR'),
  getAdminOverview
);

// ─── Error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno',
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Rivecor Ultimate → puerto ${PORT}`);

  try {
    const { initTracking } = require('./services/trackingService');
    initTracking(server);
  } catch (e) {
    console.log('ℹ️ WebSocket tracking no disponible (instala socket.io)');
  }
});