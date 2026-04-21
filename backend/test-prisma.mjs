import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.users.findMany()
  console.log('Usuarios:', users)
}

main()
  .catch((err) => {
    console.error('Error Prisma:', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })