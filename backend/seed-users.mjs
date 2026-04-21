import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function upsertUser({ email, password, name, role, companyId = null }) {
  const hashed = await bcrypt.hash(password, 10)

  const existing = await prisma.users.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existing) {
    const updated = await prisma.users.update({
      where: { email: email.toLowerCase() },
      data: {
        password: hashed,
        name,
        role,
        isActive: true,
        companyId,
      },
    })
    console.log(`Actualizado: ${updated.email} (${updated.role})`)
    return updated
  }

  const created = await prisma.users.create({
    data: {
      email: email.toLowerCase(),
      password: hashed,
      name,
      role,
      isActive: true,
      companyId,
    },
  })

  console.log(`Creado: ${created.email} (${created.role})`)
  return created
}

async function main() {
  await upsertUser({
    email: 'admin@rivecor.cl',
    password: 'Rivecor2026',
    name: 'Administrador Rivecor',
    role: 'ADMIN',
  })

  await upsertUser({
    email: 'mecanico@rivecor.cl',
    password: 'Rivecor2026',
    name: 'Mecánico Rivecor',
    role: 'OPERATOR',
  })

  await upsertUser({
    email: 'cliente@rivecor.cl',
    password: 'Rivecor2026',
    name: 'Cliente Rivecor',
    role: 'CLIENT',
  })
}

main()
  .catch((err) => {
    console.error('Error seed users:', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })