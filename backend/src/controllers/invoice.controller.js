const { PrismaClient } = require("@prisma/client");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const { sendEmail } = require("../services/notificationService");

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();

  const last = await prisma.invoices.findFirst({
    where: { number: { startsWith: `FAC-${year}-` } },
    orderBy: { number: "desc" },
  });

  if (!last) return `FAC-${year}-001`;

  const num = parseInt(last.number.split("-")[2], 10) + 1;
  return `FAC-${year}-${String(num).padStart(3, "0")}`;
}

function calcTotals(items, taxRate = 0.19) {
  const subtotal = items.reduce(
    (s, i) => s + Number(i.unitPrice || 0) * Number(i.quantity || 0),
    0
  );

  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal),
    taxAmount,
    total,
  };
}

const getAll = async (req, res) => {
  try {
    const { companyId, status } = req.query;

    const invoices = await prisma.invoices.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        companies: { select: { name: true, rut: true } },
        invoice_items: true,
      },
      orderBy: { issueDate: "desc" },
    });

    res.json(invoices);
  } catch (err) {
    console.error("invoice getAll error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: req.params.id },
      include: {
        companies: true,
        contracts: true,
        invoice_items: true,
      },
    });

    if (!invoice) return res.status(404).json({ error: "No encontrada" });

    res.json(invoice);
  } catch (err) {
    console.error("invoice getById error:", err);
    res.status(500).json({ error: err.message });
  }
};

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

    if (!companyId) {
      return res.status(400).json({ error: "companyId es requerido" });
    }

    const number = await nextInvoiceNumber();
    const tax = taxRate !== undefined ? parseFloat(taxRate) : 0.19;

    const normalizedItems = (items || []).map((item) => ({
      description: item.description || "Servicio",
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      total: Math.round(
        (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1)
      ),
      type: item.type || "SERVICE",
    }));

    const totals = calcTotals(normalizedItems, tax);

    const invoice = await prisma.invoices.create({
      data: {
        number,
        companyId,
        contractId: contractId || null,
        createdById: req.user?.id || req.user?.userId || null,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        taxRate: tax,
        ...totals,
        invoice_items: {
          create: normalizedItems,
        },
      },
      include: {
        companies: true,
        invoice_items: true,
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("invoice create error:", err);
    res.status(500).json({ error: err.message });
  }
};

const autoGenerate = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { month, year } = req.body;

    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();

    const periodStart = new Date(y, m - 1, 1);
    const periodEnd = new Date(y, m, 0);
    const dueDate = new Date(y, m, 30);

    const [company, contract, maintenanceForms] = await Promise.all([
      prisma.companies.findUnique({ where: { id: companyId } }),

      prisma.contracts.findFirst({
        where: { companyId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      }),

      prisma.maintenance_forms.findMany({
        where: {
          equipments: { companyId },
          status: "COMPLETED",
          performedAt: { gte: periodStart, lte: periodEnd },
        },
        include: {
          equipments: { select: { name: true } },
        },
      }),
    ]);

    if (!company) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    const items = [];

    if (contract?.monthlyValue) {
      items.push({
        description: `Servicio Eco Móvil 360 — ${periodStart.toLocaleDateString(
          "es-CL",
          { month: "long", year: "numeric" }
        )}`,
        quantity: 1,
        unitPrice: contract.monthlyValue,
        total: contract.monthlyValue,
        type: "MONTHLY_FEE",
      });
    }

    maintenanceForms.forEach((mtn) => {
      items.push({
        description: `Mantención preventiva — ${
          mtn.equipments?.name || "Equipo"
        } (${new Date(mtn.performedAt).toLocaleDateString("es-CL")})`,
        quantity: 1,
        unitPrice: 0,
        total: 0,
        type: "MAINTENANCE",
      });
    });

    if (items.length === 0) {
      return res
        .status(400)
        .json({ error: "Sin actividad facturable en el período" });
    }

    const number = await nextInvoiceNumber();
    const totals = calcTotals(items);

    const invoice = await prisma.invoices.create({
      data: {
        number,
        companyId,
        contractId: contract?.id || null,
        createdById: req.user?.id || req.user?.userId || null,
        periodStart,
        periodEnd,
        dueDate,
        notes: `Factura generada automáticamente para el período ${periodStart.toLocaleDateString(
          "es-CL",
          { month: "long", year: "numeric" }
        )}`,
        taxRate: 0.19,
        ...totals,
        invoice_items: {
          create: items,
        },
      },
      include: {
        companies: true,
        invoice_items: true,
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("invoice autoGenerate error:", err);
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.invoices.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) return res.status(404).json({ error: "No encontrada" });

    if (existing.status !== "DRAFT") {
      return res
        .status(400)
        .json({ error: "Solo se pueden editar facturas en borrador" });
    }

    const { items, notes, dueDate } = req.body;

    const normalizedItems = (items || []).map((item) => ({
      description: item.description || "Servicio",
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      total: Math.round(
        (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1)
      ),
      type: item.type || "SERVICE",
    }));

    const totals = calcTotals(normalizedItems, existing.taxRate);

    await prisma.invoice_items.deleteMany({
      where: { invoiceId: req.params.id },
    });

    const invoice = await prisma.invoices.update({
      where: { id: req.params.id },
      data: {
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        ...totals,
        invoice_items: {
          create: normalizedItems,
        },
      },
      include: {
        companies: true,
        invoice_items: true,
      },
    });

    res.json(invoice);
  } catch (err) {
    console.error("invoice update error:", err);
    res.status(500).json({ error: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const invoice = await prisma.invoices.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        paidAt: req.body.status === "PAID" ? new Date() : undefined,
      },
    });

    res.json(invoice);
  } catch (err) {
    console.error("invoice updateStatus error:", err);
    res.status(500).json({ error: err.message });
  }
};

const send = async (req, res) => {
  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: req.params.id },
      include: {
        companies: true,
        contracts: true,
        invoice_items: true,
      },
    });

    if (!invoice) return res.status(404).json({ error: "No encontrada" });

    const recipientEmail =
      req.body.email || invoice.companies?.contactEmail || invoice.sentTo;

    if (!recipientEmail) {
      return res.status(400).json({ error: "Email del cliente no configurado" });
    }

    const html = buildInvoiceHTML(invoice);

    await sendEmail({
      to: recipientEmail,
      subject: `Factura ${invoice.number} — Rivecor Eco Móvil 360`,
      html,
    });

    await prisma.invoices.update({
      where: { id: req.params.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        sentTo: recipientEmail,
      },
    });

    res.json({ message: `Factura enviada a ${recipientEmail}` });
  } catch (err) {
    console.error("invoice send error:", err);
    res.status(500).json({ error: err.message });
  }
};

const preview = async (req, res) => {
  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: req.params.id },
      include: {
        companies: true,
        contracts: true,
        invoice_items: true,
      },
    });

    if (!invoice) return res.status(404).json({ error: "No encontrada" });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildInvoiceHTML(invoice));
  } catch (err) {
    console.error("invoice preview error:", err);
    res.status(500).json({ error: err.message });
  }
};

const pdf = async (req, res) => {
  let browser;

  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: req.params.id },
      include: {
        companies: true,
        contracts: true,
        invoice_items: true,
      },
    });

    if (!invoice) return res.status(404).json({ error: "No encontrada" });

    const html = buildInvoiceHTML(invoice);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "18mm",
        right: "12mm",
        bottom: "18mm",
        left: "12mm",
      },
    });

    const pdfBuffer = Buffer.from(pdfBytes);

    const debugPath = path.join(process.cwd(), "debug-factura.pdf");
    fs.writeFileSync(debugPath, pdfBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${invoice.number || "factura"}.pdf"`
    );

    return res.end(pdfBuffer);
  } catch (err) {
    console.error("PDF error completo:", err);
    return res.status(500).json({
      error: "Error generando PDF",
      detail: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

function buildInvoiceHTML(invoice) {
  const STATUS_LABELS = {
    DRAFT: "Borrador",
    SENT: "Enviada",
    PAID: "Pagada",
    OVERDUE: "Vencida",
    CANCELLED: "Anulada",
  };

  const fmt = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  const company = invoice.companies;
  const contract = invoice.contracts;
  const items = invoice.invoice_items || [];

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
  td.right { text-align: right; }
  td.center { text-align: center; }
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
        <div class="folio">${invoice.number || "SIN FOLIO"}</div>
        <div class="meta">Emisión: ${fmtDate(invoice.issueDate)}</div>
        <div class="meta">Vencimiento: ${fmtDate(invoice.dueDate)}</div>
        <div class="status">Estado: ${
          STATUS_LABELS[invoice.status] || invoice.status
        }</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Datos del cliente</div>
      <div class="client-grid">
        <div class="box">
          <div class="box-row"><strong>Razón social:</strong> ${company?.name || "—"}</div>
          <div class="box-row"><strong>RUT:</strong> ${company?.rut || "—"}</div>
          <div class="box-row"><strong>Dirección:</strong> ${company?.address || "—"}</div>
          <div class="box-row"><strong>Email:</strong> ${company?.contactEmail || invoice.sentTo || "—"}</div>
        </div>

        <div class="box">
          <div class="box-row"><strong>Período desde:</strong> ${fmtDate(invoice.periodStart)}</div>
          <div class="box-row"><strong>Período hasta:</strong> ${fmtDate(invoice.periodEnd)}</div>
          <div class="box-row"><strong>Contrato:</strong> ${contract?.number || "—"}</div>
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
          ${items
            .map(
              (item) => `
            <tr>
              <td>${item.description || ""}</td>
              <td class="center">${item.quantity || 0}</td>
              <td class="right">${fmt(item.unitPrice)}</td>
              <td class="right">${fmt(item.total)}</td>
            </tr>
          `
            )
            .join("")}
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
      <div class="notes">${invoice.notes || "Sin observaciones."}</div>
    </div>

    <div class="footer">
      <div class="footer-line">Documento emitido por Rivecor Eco Móvil 360.</div>
      <div class="footer-line">Formato visual estilo SII para control interno. No corresponde a DTE oficial timbrado.</div>
      <div class="footer-line">Generado el ${new Date().toLocaleString("es-CL")}.</div>
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