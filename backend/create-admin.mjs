import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@rivecor.cl'
  const plainPassword = 'Rivecor2026'
  const password = await bcrypt.hash(plainPassword, 10)

  const existing = await prisma.users.findUnique({
    where: { email },
  })

  if (existing) {
    console.log('Ya existe este usuario:', existing.email)
    return
  }

  const user = await prisma.users.create({
    data: {
      email,
      password,
      name: 'Administrador Rivecor',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('Usuario creado:')
  console.log({
    email: user.email,
    passwordPlana: plainPassword,
    role: user.role,
  })
}

main()
  .catch((err) => {
    console.error('Error creando admin:', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })