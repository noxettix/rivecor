const ExcelJS = require('exceljs');

async function generateExcel(payload, sheetFilter = null) {
  const workbook = new ExcelJS.Workbook();

  // --- SHEET: NEUMÁTICOS ---
  if (!sheetFilter || sheetFilter === 'tires') {
    const sheet = workbook.addWorksheet('Neumáticos');

    sheet.columns = [
      { header: 'Equipo', key: 'equipment', width: 25 },
      { header: 'Posición', key: 'position', width: 15 },
      { header: 'Marca', key: 'brand', width: 20 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'KM', key: 'km', width: 15 },
    ];

    payload.equipments.forEach(eq => {
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

  // --- SHEET: HISTORIAL ---
  if (!sheetFilter || sheetFilter === 'history') {
    const sheet = workbook.addWorksheet('Historial');

    sheet.columns = [
      { header: 'Equipo', key: 'equipment', width: 25 },
      { header: 'Mecánico', key: 'mechanic', width: 20 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Fecha', key: 'date', width: 20 },
    ];

    payload.maintenances.forEach(m => {
      sheet.addRow({
        equipment: m.equipmentName,
        mechanic: m.mechanicName,
        type: m.type,
        date: m.performedAt,
      });
    });
  }

  // --- SHEET: COSTOS ---
  if (!sheetFilter || sheetFilter === 'costs') {
    const sheet = workbook.addWorksheet('Costos');

    sheet.columns = [
      { header: 'Equipo', key: 'equipment', width: 25 },
      { header: 'Marca', key: 'brand', width: 20 },
      { header: 'Costo/KM', key: 'cost', width: 15 },
    ];

    payload.costs.forEach(c => {
      sheet.addRow({
        equipment: c.equipmentName,
        brand: c.tire.brand,
        cost: c.analysis.totalCostPerKm,
      });
    });
  }

  // --- SHEET: MECÁNICOS ---
  if (!sheetFilter || sheetFilter === 'mechanics') {
    const sheet = workbook.addWorksheet('Mecánicos');

    sheet.columns = [
      { header: 'Nombre', key: 'name', width: 25 },
      { header: 'Trabajos', key: 'jobs', width: 15 },
      { header: 'Última actividad', key: 'last', width: 25 },
    ];

    payload.mechanics.forEach(m => {
      sheet.addRow({
        name: m.name,
        jobs: m.stats.totalMaintenances,
        last: m.stats.lastActivity,
      });
    });
  }

  return await workbook.xlsx.writeBuffer();
}