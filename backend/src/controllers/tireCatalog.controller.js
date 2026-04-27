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

  if (['true', '1', 'si', 'sí', 'yes', 'activo', 'active'].includes(raw)) {
    return true;
  }

  if (['false', '0', 'no', 'inactivo', 'inactive'].includes(raw)) {
    return false;
  }

  return fallback;
}

function toNumber(value, fallback = 0) {
  if (value == null || value === '') return fallback;

  const clean = String(value)
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();

  const parsed = Number(clean);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }

  return '';
}

function buildPayload(row = {}) {
  return {
    brand: normalizeUpper(
      pick(row, ['brand', 'Brand', 'marca', 'Marca', 'MARCA'])
    ),

    model: normalizeText(
      pick(row, ['model', 'Model', 'modelo', 'Modelo', 'MODELO'])
    ),

    size: normalizeUpper(
      pick(row, ['size', 'Size', 'medida', 'Medida', 'MEDIDA'])
    ),

    purchasePrice: toNumber(
      pick(row, [
        'purchasePrice',
        'Purchase Price',
        'precio',
        'Precio',
        'PRECIO',
        'price',
        'Price',
      ]),
      -1
    ),

    retread1Cost: toNumber(
      pick(row, [
        'retread1Cost',
        'Retread 1',
        'Recapado 1',
        'recapado 1',
        'recapado1',
        'Recapado1',
        'recap1',
      ]),
      0
    ),

    retread2Cost: toNumber(
      pick(row, [
        'retread2Cost',
        'Retread 2',
        'Recapado 2',
        'recapado 2',
        'recapado2',
        'Recapado2',
        'recap2',
      ]),
      0
    ),

    repairCost: toNumber(
      pick(row, [
        'repairCost',
        'Repair Cost',
        'Reparacion',
        'Reparación',
        'reparacion',
        'reparación',
        'repair',
        'Repair',
      ]),
      0
    ),

    depthNew: toNumber(
      pick(row, [
        'depthNew',
        'Depth new',
        'Depth New',
        'depth new',
        'profundidad_nueva',
        'Profundidad nueva',
        'Profundidad Nueva',
      ]),
      -1
    ),

    depthMin: toNumber(
      pick(row, [
        'depthMin',
        'Depth min',
        'Depth Min',
        'depth min',
        'profundidad_min',
        'Profundidad mínima',
        'Profundidad minima',
        'Profundidad Minima',
      ]),
      -1
    ),

    kmNew: toNumber(
      pick(row, [
        'kmNew',
        'KM nuevo',
        'Km nuevo',
        'km nuevo',
        'KM Nuevo',
        'kilometraje nuevo',
        'Kilometraje nuevo',
      ]),
      0
    ),

    kmRetread1: toNumber(
      pick(row, [
        'kmRetread1',
        'KM recapado 1',
        'Km recapado 1',
        'km recapado 1',
        'KM Recapado 1',
        'kilometraje recapado 1',
      ]),
      0
    ),

    kmRetread2: toNumber(
      pick(row, [
        'kmRetread2',
        'KM recapado 2',
        'Km recapado 2',
        'km recapado 2',
        'KM Recapado 2',
        'kilometraje recapado 2',
      ]),
      0
    ),

    active: toBool(
      pick(row, ['active', 'Active', 'activo', 'Activo', 'ACTIVO']),
      true
    ),
  };
}

function validatePayload(payload) {
  if (!payload.brand) return 'La marca es obligatoria';
  if (!payload.model) return 'El modelo es obligatorio';
  if (!payload.size) return 'La medida es obligatoria';

  if (payload.purchasePrice < 0) {
    return 'El precio de compra debe ser válido';
  }

  if (payload.depthNew <= 0) {
    return 'La profundidad nueva debe ser mayor a 0';
  }

  if (payload.depthMin < 0) {
    return 'La profundidad mínima debe ser válida';
  }

  if (payload.depthMin >= payload.depthNew) {
    return 'La profundidad mínima debe ser menor que la profundidad nueva';
  }

  return null;
}

const getAll = async (req, res) => {
  try {
    const items = await prisma.tireCatalog.findMany({
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { size: 'asc' }],
    });

    return res.json(items);
  } catch (error) {
    console.error('tireCatalog.getAll error:', error);
    return res.status(500).json({
      error: 'No se pudo obtener el catálogo',
      details: error.message,
    });
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

    return res.status(500).json({
      error: 'No se pudo crear el registro',
      details: error.message,
    });
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

    return res.status(500).json({
      error: 'No se pudo actualizar el registro',
      details: error.message,
    });
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

    return res.status(500).json({
      error: 'No se pudo eliminar el registro',
      details: error.message,
    });
  }
};

const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Debes subir un archivo Excel o CSV',
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        error: 'El archivo no contiene hojas',
      });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        error: 'El archivo está vacío',
      });
    }

    const errors = [];
    const normalizedRows = [];

    rows.forEach((row, index) => {
      const payload = buildPayload(row);
      const validationError = validatePayload(payload);

      if (validationError) {
        errors.push({
          row: index + 2,
          error: validationError,
          data: row,
        });
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

    return res.status(500).json({
      error: 'No se pudo procesar el archivo',
      details: error.message,
    });
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
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { size: 'asc' }],
      take: 20,
    });

    return res.json(items);
  } catch (error) {
    console.error('tireCatalog.findCatalogMatch error:', error);

    return res.status(500).json({
      error: 'No se pudo consultar el catálogo',
      details: error.message,
    });
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