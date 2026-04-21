const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function normalizeText(value = '') {
  return String(value || '').trim();
}

function normalizeUpper(value = '') {
  return normalizeText(value).toUpperCase();
}

function toBool(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value == null || value === '') return fallback;

  const raw = String(value).trim().toLowerCase();
  if (['true', '1', 'si', 'sí', 'yes', 'activo'].includes(raw)) return true;
  if (['false', '0', 'no', 'inactivo'].includes(raw)) return false;

  return fallback;
}

function toNumber(value, fallback = 0) {
  if (value == null || value === '') return fallback;

  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPayload(row = {}) {
  const payload = {
    brand: normalizeUpper(row.brand || row.marca),
    model: normalizeText(row.model || row.modelo),
    size: normalizeUpper(row.size || row.medida),
    purchasePrice: toNumber(row.purchasePrice || row.precio || row.price, -1),
    retread1Cost: toNumber(row.retread1Cost || row.recapado1 || row.recap1, 0),
    retread2Cost: toNumber(row.retread2Cost || row.recapado2 || row.recap2, 0),
    repairCost: toNumber(row.repairCost || row.reparacion || row.repair, 0),
    depthNew: toNumber(row.depthNew || row.profundidad_nueva || row.depth_new, -1),
    depthMin: toNumber(row.depthMin || row.profundidad_min || row.depth_min, -1),
    active: toBool(row.active || row.activo, true),
  };

  return payload;
}

function validatePayload(payload) {
  if (!payload.brand) return 'La marca es obligatoria';
  if (!payload.model) return 'El modelo es obligatorio';
  if (!payload.size) return 'La medida es obligatoria';
  if (payload.purchasePrice < 0) return 'El precio de compra debe ser válido';
  if (payload.depthNew <= 0) return 'La profundidad nueva debe ser mayor a 0';
  if (payload.depthMin < 0) return 'La profundidad mínima debe ser válida';
  if (payload.depthMin >= payload.depthNew) {
    return 'La profundidad mínima debe ser menor que la profundidad nueva';
  }

  return null;
}

const getAll = async (req, res) => {
  try {
    const items = await prisma.tireCatalog.findMany({
      orderBy: [
        { brand: 'asc' },
        { model: 'asc' },
        { size: 'asc' },
      ],
    });

    return res.json(items);
  } catch (error) {
    console.error('tireCatalog.getAll error:', error);
    return res.status(500).json({ error: 'No se pudo obtener el catálogo' });
  }
};

const createOne = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    const validationError = validatePayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const created = await prisma.tireCatalog.create({
      data: payload,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('tireCatalog.createOne error:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un neumático con esa marca, modelo y medida',
      });
    }

    return res.status(500).json({ error: 'No se pudo crear el registro' });
  }
};

const updateOne = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    const validationError = validatePayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const updated = await prisma.tireCatalog.update({
      where: { id: req.params.id },
      data: payload,
    });

    return res.json(updated);
  } catch (error) {
    console.error('tireCatalog.updateOne error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un neumático con esa marca, modelo y medida',
      });
    }

    return res.status(500).json({ error: 'No se pudo actualizar el registro' });
  }
};

const deleteOne = async (req, res) => {
  try {
    await prisma.tireCatalog.delete({
      where: { id: req.params.id },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('tireCatalog.deleteOne error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    return res.status(500).json({ error: 'No se pudo eliminar el registro' });
  }
};

const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debes subir un archivo Excel o CSV' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({ error: 'El archivo no contiene hojas' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const errors = [];
    const normalizedRows = [];

    rows.forEach((row, index) => {
      const payload = buildPayload(row);
      const validationError = validatePayload(payload);

      if (validationError) {
        errors.push(`Fila ${index + 2}: ${validationError}`);
        return;
      }

      normalizedRows.push(payload);
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'El archivo tiene filas inválidas',
        details: errors,
      });
    }

    let inserted = 0;
    let updated = 0;

    for (const row of normalizedRows) {
      const existing = await prisma.tireCatalog.findFirst({
        where: {
          brand: row.brand,
          model: row.model,
          size: row.size,
        },
      });

      if (existing) {
        await prisma.tireCatalog.update({
          where: { id: existing.id },
          data: row,
        });
        updated += 1;
      } else {
        await prisma.tireCatalog.create({
          data: row,
        });
        inserted += 1;
      }
    }

    return res.json({
      ok: true,
      total: normalizedRows.length,
      inserted,
      updated,
    });
  } catch (error) {
    console.error('tireCatalog.uploadExcel error:', error);
    return res.status(500).json({ error: 'No se pudo procesar el archivo' });
  }
};

const findCatalogMatch = async (req, res) => {
  try {
    const brand = normalizeUpper(req.query.brand);
    const model = normalizeText(req.query.model);
    const size = normalizeUpper(req.query.size);

    if (!brand && !model && !size) {
      return res.status(400).json({
        error: 'Debes enviar al menos brand, model o size',
      });
    }

    const items = await prisma.tireCatalog.findMany({
      where: {
        active: true,
        ...(brand ? { brand } : {}),
        ...(model ? { model: { equals: model, mode: 'insensitive' } } : {}),
        ...(size ? { size } : {}),
      },
      orderBy: [
        { brand: 'asc' },
        { model: 'asc' },
        { size: 'asc' },
      ],
      take: 20,
    });

    return res.json(items);
  } catch (error) {
    console.error('tireCatalog.findCatalogMatch error:', error);
    return res.status(500).json({ error: 'No se pudo consultar el catálogo' });
  }
};

module.exports = {
  getAll,
  createOne,
  updateOne,
  deleteOne,
  uploadExcel,
  findCatalogMatch,
};