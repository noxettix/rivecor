const ExcelJS = require('exceljs');

/* ================== GENERAR EXCEL ================== */
async function generateExcel(payload, sheetFilter = null) {
  const workbook = new ExcelJS.Workbook();

  if (!sheetFilter || sheetFilter === 'tires') {
    const sheet = workbook.addWorksheet('Neumáticos');

    sheet.columns = [
      { header: 'Equipo', key: 'equipment', width: 25 },
      { header: 'Posición', key: 'position', width: 15 },
      { header: 'Marca', key: 'brand', width: 20 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'KM', key: 'km', width: 15 },
    ];

    payload.equipments?.forEach(eq => {
      (eq.tires || []).forEach(t => {
        sheet.addRow({
          equipment: eq.name,
          position: t.position,
          brand: t.brand,
          status: t.status,
          km: t.mileage,
        });
      });
    });
  }

  if (!sheetFilter || sheetFilter === 'history') {
    const sheet = workbook.addWorksheet('Historial');

    sheet.columns = [
      { header: 'Equipo', key: 'equipment', width: 25 },
      { header: 'Mecánico', key: 'mechanic', width: 20 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Fecha', key: 'date', width: 20 },
    ];

    payload.maintenances?.forEach(m => {
      sheet.addRow({
        equipment: m.equipmentName,
        mechanic: m.mechanicName,
        type: m.type,
        date: m.performedAt,
      });
    });
  }

  if (!sheetFilter || sheetFilter === 'costs') {
    const sheet = workbook.addWorksheet('Costos');

    sheet.columns = [
      { header: 'Equipo', key: 'equipment', width: 25 },
      { header: 'Marca', key: 'brand', width: 20 },
      { header: 'Costo/KM', key: 'cost', width: 15 },
    ];

    payload.costs?.forEach(c => {
      sheet.addRow({
        equipment: c.equipmentName,
        brand: c.tire?.brand,
        cost: c.analysis?.totalCostPerKm,
      });
    });
  }

  if (!sheetFilter || sheetFilter === 'mechanics') {
    const sheet = workbook.addWorksheet('Mecánicos');

    sheet.columns = [
      { header: 'Nombre', key: 'name', width: 25 },
      { header: 'Trabajos', key: 'jobs', width: 15 },
      { header: 'Última actividad', key: 'last', width: 25 },
    ];

    payload.mechanics?.forEach(m => {
      sheet.addRow({
        name: m.name,
        jobs: m.stats?.totalMaintenances,
        last: m.stats?.lastActivity,
      });
    });
  }

  return await workbook.xlsx.writeBuffer();
}

/* ================== MOCK DATA (para que funcione YA) ================== */
async function collectReportData() {
  return {
    equipments: [],
    maintenances: [],
    costs: [],
    mechanics: [],
  };
}

/* ================== CONTROLLERS ================== */

const downloadFull = async (req, res) => {
  try {
    const payload = await collectReportData();
    const buf = await generateExcel(payload);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Rivecor_Reporte_Completo.xlsx"'
    );

    res.send(buf);
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: err.message });
  }
};

const downloadTires = async (req, res) => {
  const payload = await collectReportData();
  const buf = await generateExcel(payload, 'tires');
  res.send(buf);
};

const downloadHistory = async (req, res) => {
  const payload = await collectReportData();
  const buf = await generateExcel(payload, 'history');
  res.send(buf);
};

const downloadCosts = async (req, res) => {
  const payload = await collectReportData();
  const buf = await generateExcel(payload, 'costs');
  res.send(buf);
};

const downloadMechanics = async (req, res) => {
  const payload = await collectReportData();
  const buf = await generateExcel(payload, 'mechanics');
  res.send(buf);
};

/* ================== EXPORT ================== */

module.exports = {
  downloadFull,
  downloadTires,
  downloadHistory,
  downloadCosts,
  downloadMechanics,
};