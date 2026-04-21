const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const { sendEmail } = require('../services/notificationService');

// ─── Helper: generar número de factura ──────────────────────
async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: `FAC-${year}-` } },
    orderBy: { number: 'desc' },
  });

  if (!last) return `FAC-${year}-001`;

  const num = parseInt(last.number.split('-')[2], 10) + 1;
  return `FAC-${year}-${String(num).padStart(3, '0')}`;
}

// ─── Helper: calcular totales ────────────────────────────────
function calcTotals(items, taxRate = 0.19) {
  const subtotal = items.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.quantity || 0)), 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;
  return {
    subtotal: Math.round(subtotal),
    taxAmount,
    total,
  };
}

// GET /api/invoices
const getAll = async (req, res) => {
  try {
    const { companyId, status } = req.query;

    const where = {
      ...(companyId ? { companyId } : {}),
      ...(status ? { status } : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        company: { select: { name: true, rut: true } },
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/invoices/:id
const getById = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        contract: true,
        items: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/invoices — crear factura manual
const create = async (req, res) => {
  try {
    const {
      companyId,
      contractId,
      periodStart,
      periodEnd,
      dueDate,
      notes,
      items,
      taxRate,
    } = req.body;

    const number = await nextInvoiceNumber();
    const tax = taxRate !== undefined ? parseFloat(taxRate) : 0.19;
    const normalizedItems = (items || []).map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      total: Math.round((parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1)),
      type: item.type || 'SERVICE',
    }));

    const totals = calcTotals(normalizedItems, tax);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        companyId,
        contractId: contractId || null,
        createdById: req.user.id,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        taxRate: tax,
        ...totals,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        company: true,
        items: true,
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/invoices/auto/:companyId — generar factura automática del mes
const autoGenerate = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { month, year } = req.body;

    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();

    const periodStart = new Date(y, m - 1, 1);
    const periodEnd = new Date(y, m, 0);
    const dueDate = new Date(y, m, 30);

    const [company, contract, maintenances, tireInstalls] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.contract.findFirst({
        where: { companyId, status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
      }),
      prisma.maintenanceForm.findMany({
        where: {
          equipment: { companyId },
          status: 'COMPLETED',
          performedAt: { gte: periodStart, lte: periodEnd },
        },
        include: {
          equipment: { select: { name: true } },
        },
      }),
      prisma.tireLifecycleEvent
        ? prisma.tireLifecycleEvent.findMany({
            where: {
              event: { in: ['INSTALL', 'REINSTALL'] },
              performedAt: { gte: periodStart, lte: periodEnd },
              stockTire: { installCount: { gte: 0 } },
            },
            include: { stockTire: true },
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const items = [];

    if (contract?.monthlyValue) {
      items.push({
        description: `Servicio Eco Móvil 360 — ${new Date(periodStart).toLocaleDateString('es-CL', {
          month: 'long',
          year: 'numeric',
        })}`,
        quantity: 1,
        unitPrice: contract.monthlyValue,
        total: contract.monthlyValue,
        type: 'MONTHLY_FEE',
      });
    }

    maintenances.forEach((mtn) => {
      items.push({
        description: `Mantención preventiva — ${mtn.equipment?.name || 'Equipo'} (${new Date(mtn.performedAt).toLocaleDateString('es-CL')})`,
        quantity: 1,
        unitPrice: 0,
        total: 0,
        type: 'MAINTENANCE',
      });
    });

    tireInstalls.forEach((ev) => {
      if (ev.salePrice) {
        items.push({
          description: `Neumático ${ev.stockTire?.brand || ''} ${ev.stockTire?.size || ''} — ${ev.stockTire?.code || ''}`.trim(),
          quantity: 1,
          unitPrice: ev.salePrice,
          total: ev.salePrice,
          type: 'TIRE_SALE',
        });
      }
    });

    if (items.length === 0) {
      return res.status(400).json({ error: 'Sin actividad facturable en el período' });
    }

    const number = await nextInvoiceNumber();
    const totals = calcTotals(items);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        companyId,
        contractId: contract?.id || null,
        createdById: req.user.id,
        periodStart,
        periodEnd,
        dueDate,
        notes: `Factura generada automáticamente para el período ${new Date(periodStart).toLocaleDateString('es-CL', {
          month: 'long',
          year: 'numeric',
        })}`,
        taxRate: 0.19,
        ...totals,
        items: { create: items },
      },
      include: {
        company: true,
        items: true,
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/invoices/:id — editar (solo DRAFT)
const update = async (req, res) => {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Solo se pueden editar facturas en borrador' });
    }

    const { items, notes, dueDate } = req.body;
    const normalizedItems = (items || []).map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      total: Math.round((parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1)),
      type: item.type || 'SERVICE',
    }));

    const totals = calcTotals(normalizedItems, existing.taxRate);

    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: req.params.id },
    });

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        notes,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        ...totals,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        company: true,
        items: true,
      },
    });

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/invoices/:id/send — enviar por email
const send = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { company: true, contract: true, items: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    const recipientEmail = req.body.email || invoice.company?.contactEmail || invoice.sentTo;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Email del cliente no configurado' });
    }

    const html = buildInvoiceHTML(invoice);

    await sendEmail({
      to: recipientEmail,
      subject: `Factura ${invoice.number} — Rivecor Eco Móvil 360`,
      html,
    });

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentTo: recipientEmail,
      },
    });

    res.json({ message: `Factura enviada a ${recipientEmail}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/invoices/:id/status — marcar pagada / anular
const updateStatus = async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/invoices/:id/preview — HTML
const preview = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { company: true, contract: true, items: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildInvoiceHTML(invoice));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/invoices/:id/pdf — PDF real
const pdf = async (req, res) => {
  let browser;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { company: true, contract: true, items: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    const html = buildInvoiceHTML(invoice);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        right: '12mm',
        bottom: '18mm',
        left: '12mm',
      },
    });

    const pdfBuffer = Buffer.from(pdfBytes);

    const debugPath = path.join(process.cwd(), 'debug-factura.pdf');
    fs.writeFileSync(debugPath, pdfBuffer);

    console.log('PDF creado correctamente en:', debugPath);
    console.log('Tamaño PDF:', pdfBuffer.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.number || 'factura'}.pdf"`
    );

    return res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF error completo:', err);
    return res.status(500).json({
      error: 'Error generando PDF',
      detail: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

// ─── HTML estilo SII ─────────────────────────────────────────
function buildInvoiceHTML(invoice) {
  const STATUS_LABELS = {
    DRAFT: 'Borrador',
    SENT: 'Enviada',
    PAID: 'Pagada',
    OVERDUE: 'Vencida',
    CANCELLED: 'Anulada',
  };

  const fmt = (n) => `$${Math.round(n || 0).toLocaleString('es-CL')}`;
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Factura ${invoice.number}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #111827;
    background: #ffffff;
  }

  .page {
    width: 100%;
    border: 1px solid #111827;
  }

  .top {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    border-bottom: 2px solid #111827;
  }

  .issuer {
    padding: 18px;
    min-height: 145px;
  }

  .issuer h1 {
    margin: 0 0 4px 0;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .issuer .sub {
    font-size: 12px;
    color: #374151;
    margin-bottom: 10px;
    font-weight: 700;
  }

  .issuer .line {
    margin: 2px 0;
    color: #374151;
    font-size: 11px;
  }

  .sii-box {
    border-left: 2px solid #111827;
    padding: 18px;
    text-align: center;
    min-height: 145px;
  }

  .sii-box .doc {
    font-size: 16px;
    font-weight: 800;
    color: #b91c1c;
    margin-bottom: 6px;
  }

  .sii-box .folio {
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 10px;
  }

  .sii-box .meta {
    font-size: 11px;
    color: #374151;
    margin-top: 4px;
  }

  .section {
    padding: 14px 18px;
    border-bottom: 1px solid #d1d5db;
  }

  .section-title {
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 8px;
    text-transform: uppercase;
    color: #111827;
  }

  .client-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .box {
    border: 1px solid #d1d5db;
    padding: 10px 12px;
    min-height: 86px;
  }

  .box-row {
    margin: 4px 0;
    font-size: 11px;
  }

  .box-row strong {
    display: inline-block;
    min-width: 98px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #111827;
    padding: 8px 6px;
    font-size: 11px;
    vertical-align: top;
  }

  th {
    background: #f3f4f6;
    text-transform: uppercase;
    font-size: 10px;
    text-align: center;
  }

  td.right {
    text-align: right;
  }

  td.center {
    text-align: center;
  }

  .totals-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .totals {
    width: 320px;
    border: 1px solid #111827;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid #d1d5db;
    font-size: 11px;
  }

  .totals-row.final {
    font-size: 14px;
    font-weight: 800;
    background: #f3f4f6;
    border-bottom: none;
  }

  .notes {
    white-space: pre-wrap;
    line-height: 1.5;
    font-size: 11px;
  }

  .footer {
    padding: 14px 18px;
  }

  .footer-line {
    margin: 3px 0;
    font-size: 10px;
    color: #4b5563;
  }

  .status {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 10px;
    border: 1px solid #111827;
    font-size: 10px;
    font-weight: 700;
    background: #f9fafb;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="issuer">
        <h1>RIVECOR</h1>
        <div class="sub">Eco Móvil 360</div>
        <div class="line"><strong>Giro:</strong> Gestión y servicio de neumáticos</div>
        <div class="line"><strong>Contacto:</strong> evelyn@rivecor.cl</div>
        <div class="line"><strong>Teléfono:</strong> +56 9 XXXX XXXX</div>
        <div class="line"><strong>Ciudad:</strong> Santiago, Chile</div>
      </div>

      <div class="sii-box">
        <div class="doc">FACTURA</div>
        <div class="folio">${invoice.number || 'SIN FOLIO'}</div>
        <div class="meta">Emisión: ${fmtDate(invoice.issueDate)}</div>
        <div class="meta">Vencimiento: ${fmtDate(invoice.dueDate)}</div>
        <div class="status">Estado: ${STATUS_LABELS[invoice.status] || invoice.status}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Datos del cliente</div>
      <div class="client-grid">
        <div class="box">
          <div class="box-row"><strong>Razón social:</strong> ${invoice.company?.name || '—'}</div>
          <div class="box-row"><strong>RUT:</strong> ${invoice.company?.rut || '—'}</div>
          <div class="box-row"><strong>Dirección:</strong> ${invoice.company?.address || '—'}</div>
          <div class="box-row"><strong>Email:</strong> ${invoice.company?.contactEmail || invoice.sentTo || '—'}</div>
        </div>

        <div class="box">
          <div class="box-row"><strong>Período desde:</strong> ${fmtDate(invoice.periodStart)}</div>
          <div class="box-row"><strong>Período hasta:</strong> ${fmtDate(invoice.periodEnd)}</div>
          <div class="box-row"><strong>Contrato:</strong> ${invoice.contract?.number || '—'}</div>
          <div class="box-row"><strong>Condición pago:</strong> Contra factura / transferencia</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Detalle</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Descripción</th>
            <th style="width: 12%;">Cantidad</th>
            <th style="width: 18%;">Precio unitario</th>
            <th style="width: 20%;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td class="center">${item.quantity || 0}</td>
              <td class="right">${fmt(item.unitPrice)}</td>
              <td class="right">${fmt(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${fmt(invoice.subtotal)}</span>
          </div>
          <div class="totals-row">
            <span>IVA (${Math.round((invoice.taxRate || 0.19) * 100)}%)</span>
            <span>${fmt(invoice.taxAmount)}</span>
          </div>
          <div class="totals-row final">
            <span>TOTAL</span>
            <span>${fmt(invoice.total)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Observaciones</div>
      <div class="notes">${invoice.notes || 'Sin observaciones.'}</div>
    </div>

    <div class="footer">
      <div class="footer-line">Documento emitido por Rivecor Eco Móvil 360.</div>
      <div class="footer-line">Formato visual estilo SII para control interno. No corresponde a DTE oficial timbrado.</div>
      <div class="footer-line">Generado el ${new Date().toLocaleString('es-CL')}.</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  getAll,
  getById,
  create,
  autoGenerate,
  update,
  send,
  updateStatus,
  preview,
  pdf,
};