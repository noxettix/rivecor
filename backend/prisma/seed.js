require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const adminPass = await bcrypt.hash('rivecor2024', 10);
  const clientPass = await bcrypt.hash('cliente2024', 10);
  const mechanicPass = await bcrypt.hash('mecanico2024', 10);

  const company = await prisma.company.upsert({
    where: { rut: '76.123.456-7' },
    update: {
      name: 'Minera Los Andes S.A.',
      industry: 'Minería',
      address: 'Ruta 5 Norte Km 450, Copiapó',
      phone: '+56 9 1234 5678',
      contactName: 'Juan Pérez',
      contactEmail: 'cliente@minera.cl',
    },
    create: {
      rut: '76.123.456-7',
      name: 'Minera Los Andes S.A.',
      industry: 'Minería',
      address: 'Ruta 5 Norte Km 450, Copiapó',
      phone: '+56 9 1234 5678',
      contactName: 'Juan Pérez',
      contactEmail: 'cliente@minera.cl',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@rivecor.cl' },
    update: {
      name: 'Evelyn Rivera',
      password: adminPass,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: 'admin@rivecor.cl',
      password: adminPass,
      name: 'Evelyn Rivera',
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cliente@minera.cl' },
    update: {
      name: 'Juan Pérez',
      password: clientPass,
      role: 'CLIENT',
      companyId: company.id,
      isActive: true,
    },
    create: {
      email: 'cliente@minera.cl',
      password: clientPass,
      name: 'Juan Pérez',
      password: clientPass,
      role: 'CLIENT',
      companyId: company.id,
      isActive: true,
    },
  });

  const mechanicUser = await prisma.user.upsert({
    where: { email: 'mecanico@rivecor.cl' },
    update: {
      name: 'Juan Soto',
      password: mechanicPass,
      role: 'OPERATOR',
      companyId: company.id,
      isActive: true,
    },
    create: {
      email: 'mecanico@rivecor.cl',
      password: mechanicPass,
      name: 'Juan Soto',
      role: 'OPERATOR',
      companyId: company.id,
      isActive: true,
    },
  });

  await prisma.mechanic.upsert({
    where: { rut: '12.345.678-9' },
    update: {
      name: 'Juan Soto',
      phone: '+56 9 1111 2222',
      email: 'mecanico@rivecor.cl',
      speciality: 'Neumáticos',
      certifications: 'Michelin Certified',
      userId: mechanicUser.id,
      isActive: true,
    },
    create: {
      name: 'Juan Soto',
      rut: '12.345.678-9',
      phone: '+56 9 1111 2222',
      email: 'mecanico@rivecor.cl',
      speciality: 'Neumáticos',
      certifications: 'Michelin Certified',
      userId: mechanicUser.id,
      isActive: true,
    },
  });

  await prisma.mechanic.upsert({
    where: { rut: '13.456.789-0' },
    update: {
      name: 'Pedro Díaz',
      phone: '+56 9 3333 4444',
      email: 'pedro@rivecor.cl',
      speciality: 'Neumáticos / Hidráulica',
      isActive: true,
    },
    create: {
      name: 'Pedro Díaz',
      rut: '13.456.789-0',
      phone: '+56 9 3333 4444',
      email: 'pedro@rivecor.cl',
      speciality: 'Neumáticos / Hidráulica',
      isActive: true,
    },
  });

  const existingTruck = await prisma.equipment.findFirst({
    where: { companyId: company.id, code: 'CAM-001' },
  });

  let truck = existingTruck;
  if (!truck) {
    truck = await prisma.equipment.create({
      data: {
        companyId: company.id,
        code: 'CAM-001',
        name: 'Camión Tolva 01',
        type: 'TRUCK',
        brand: 'Volvo',
        model: 'FMX 540',
        year: 2020,
        licensePlate: 'BJKP-12',
        location: 'Faena Norte',
      },
    });

    await prisma.tire.createMany({
      data: [
        {
          equipmentId: truck.id,
          position: 'Delantera Izquierda',
          brand: 'Michelin',
          size: '315/80R22.5',
          currentDepth: 12,
          initialDepth: 18,
          pressure: 110,
          recommendedPressure: 110,
          mileage: 30000,
          maxMileage: 80000,
          purchasePrice: 450000,
          status: 'OK',
        },
        {
          equipmentId: truck.id,
          position: 'Delantera Derecha',
          brand: 'Michelin',
          size: '315/80R22.5',
          currentDepth: 4.2,
          initialDepth: 18,
          pressure: 95,
          recommendedPressure: 110,
          mileage: 62000,
          maxMileage: 80000,
          purchasePrice: 450000,
          status: 'WARNING',
        },
        {
          equipmentId: truck.id,
          position: 'Trasera Iz. Externa',
          brand: 'Bridgestone',
          size: '315/80R22.5',
          currentDepth: 2.1,
          initialDepth: 18,
          pressure: 108,
          recommendedPressure: 110,
          mileage: 75000,
          maxMileage: 80000,
          purchasePrice: 480000,
          status: 'CRITICAL',
        },
        {
          equipmentId: truck.id,
          position: 'Trasera Iz. Interna',
          brand: 'Bridgestone',
          size: '315/80R22.5',
          currentDepth: 8,
          initialDepth: 18,
          pressure: 112,
          recommendedPressure: 110,
          mileage: 40000,
          maxMileage: 80000,
          purchasePrice: 480000,
          status: 'OK',
        },
        {
          equipmentId: truck.id,
          position: 'Trasera De. Externa',
          brand: 'Goodyear',
          size: '315/80R22.5',
          currentDepth: 5.5,
          initialDepth: 18,
          pressure: 90,
          recommendedPressure: 110,
          mileage: 55000,
          maxMileage: 80000,
          purchasePrice: 460000,
          status: 'WARNING',
        },
        {
          equipmentId: truck.id,
          position: 'Trasera De. Interna',
          brand: 'Goodyear',
          size: '315/80R22.5',
          currentDepth: 7,
          initialDepth: 18,
          pressure: 108,
          recommendedPressure: 110,
          mileage: 41000,
          maxMileage: 80000,
          purchasePrice: 460000,
          status: 'OK',
        },
      ],
    });
  }

  const existingLoader = await prisma.equipment.findFirst({
    where: { companyId: company.id, code: 'CAR-001' },
  });

  let loader = existingLoader;
  if (!loader) {
    loader = await prisma.equipment.create({
      data: {
        companyId: company.id,
        code: 'CAR-001',
        name: 'Cargador Frontal 01',
        type: 'LOADER',
        brand: 'Caterpillar',
        model: '966M',
        year: 2019,
        location: 'Faena Sur',
      },
    });

    await prisma.tire.createMany({
      data: [
        {
          equipmentId: loader.id,
          position: 'Delantera Izquierda',
          brand: 'Michelin',
          size: '26.5R25',
          currentDepth: 45,
          initialDepth: 65,
          pressure: 180,
          recommendedPressure: 175,
          mileage: 5000,
          maxMileage: 15000,
          purchasePrice: 1200000,
          status: 'OK',
        },
        {
          equipmentId: loader.id,
          position: 'Delantera Derecha',
          brand: 'Michelin',
          size: '26.5R25',
          currentDepth: 41,
          initialDepth: 65,
          pressure: 170,
          recommendedPressure: 175,
          mileage: 5000,
          maxMileage: 15000,
          purchasePrice: 1200000,
          status: 'OK',
        },
        {
          equipmentId: loader.id,
          position: 'Trasera Izquierda',
          brand: 'Bridgestone',
          size: '26.5R25',
          currentDepth: 22,
          initialDepth: 65,
          pressure: 155,
          recommendedPressure: 175,
          mileage: 12000,
          maxMileage: 15000,
          purchasePrice: 1100000,
          status: 'WARNING',
        },
        {
          equipmentId: loader.id,
          position: 'Trasera Derecha',
          brand: 'Bridgestone',
          size: '26.5R25',
          currentDepth: 19,
          initialDepth: 65,
          pressure: 150,
          recommendedPressure: 175,
          mileage: 14500,
          maxMileage: 15000,
          purchasePrice: 1100000,
          status: 'CRITICAL',
        },
      ],
    });
  }

  const existingContract = await prisma.contract.findFirst({
    where: { number: 'CONT-2024-001' },
  });

  if (!existingContract) {
    await prisma.contract.create({
      data: {
        number: 'CONT-2024-001',
        companyId: company.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
        monthlyValue: 850000,
        notes: 'Servicio mensual preventivo - 2 equipos',
      },
    });
  }

  console.log('✅ Seed OK');
  console.log('📧 admin@rivecor.cl     / rivecor2024');
  console.log('📧 mecanico@rivecor.cl  / mecanico2024');
  console.log('📧 cliente@minera.cl    / cliente2024');
}

main()
  .catch((err) => {
    console.error('❌ Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });