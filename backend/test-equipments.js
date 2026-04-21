const { prisma } = require('./src/lib/prisma');

function getEquipmentModel() {
  return prisma.equipment || prisma.equipments || null;
}

async function main() {
  const Equipment = getEquipmentModel();

  if (!Equipment) {
    console.log('Modelos disponibles en prisma:');
    console.log(
      Object.keys(prisma)
        .filter((k) => !k.startsWith('$') && !k.startsWith('_'))
        .sort()
    );
    throw new Error('No existe modelo equipment/equipments en Prisma');
  }

  const data = await Equipment.findMany({
    take: 20,
  });

  console.log(data);
}

main()
  .catch((e) => {
    console.error('ERROR test-equipments:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });