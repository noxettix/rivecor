const { prisma } = require('./src/lib/prisma');

async function main() {
  const users = await prisma.users.findMany({
    take: 5,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  console.log(users);
}

main()
  .catch((e) => {
    console.error('DB ERROR:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });