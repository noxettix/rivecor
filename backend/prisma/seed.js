const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  const password = await bcrypt.hash("123456", 10);

  const company = await prisma.companies.upsert({
    where: { rut: "11111111-1" },
    update: {},
    create: {
      rut: "11111111-1",
      name: "Minera Cruz",
      industry: "Minería",
      isActive: true,
    },
  });

  await prisma.users.upsert({
    where: { email: "admin@rivecor.cl" },
    update: {
      password,
      isActive: true,
    },
    create: {
      email: "admin@rivecor.cl",
      password,
      name: "Admin Rivecor",
      role: "ADMIN",
      isActive: true,
    },
  });

  await prisma.users.upsert({
    where: { email: "cliente@minera.cl" },
    update: {
      password,
      isActive: true,
      companyId: company.id,
    },
    create: {
      email: "cliente@minera.cl",
      password,
      name: "Juan Pérez",
      role: "CLIENT",
      isActive: true,
      companyId: company.id,
    },
  });

  await prisma.users.upsert({
    where: { email: "mecanico@rivecor.cl" },
    update: {
      password,
      isActive: true,
    },
    create: {
      email: "mecanico@rivecor.cl",
      password,
      name: "Mecánico Juan",
      role: "OPERATOR",
      isActive: true,
    },
  });

  console.log("✅ Seed listo");
  console.log("admin@rivecor.cl / 123456");
  console.log("cliente@minera.cl / 123456");
  console.log("mecanico@rivecor.cl / 123456");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });