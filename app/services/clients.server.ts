import prisma from "../../prisma/prisma"

export async function listClients(userId: number, search = "") {
  return prisma.client.findMany({
    where: {
      userId,
      ...(search && { fullName: { contains: search } }),
    },
    include: { _count: { select: { bikes: true, appointments: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getClientById(id: number, userId: number) {
  return prisma.client.findFirst({
    where: { id, userId },
    include: {
      bikes: { orderBy: { createdAt: "desc" } },
      appointments: {
        include: { bike: { select: { id: true, model: true, brand: true } } },
        orderBy: { serviceDate: "desc" },
      },
    },
  })
}

export async function createClient(
  userId: number,
  data: {
    fullName: string
    cpf?: string | null
    email?: string | null
    phone?: string | null
    birthDate?: string | null
    address?: string | null
    notes?: string | null
  }
) {
  return prisma.client.create({
    data: {
      userId,
      fullName: data.fullName,
      cpf: data.cpf || null,
      email: data.email || null,
      phone: data.phone || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      address: data.address || null,
      notes: data.notes || null,
    },
  })
}

export async function updateClient(
  id: number,
  userId: number,
  data: {
    fullName?: string
    cpf?: string | null
    email?: string | null
    phone?: string | null
    birthDate?: string | null
    address?: string | null
    notes?: string | null
  }
) {
  const exists = await prisma.client.findFirst({ where: { id, userId } })
  if (!exists) return null

  const { birthDate, ...rest } = data
  return prisma.client.update({
    where: { id },
    data: {
      ...rest,
      ...(birthDate !== undefined && {
        birthDate: birthDate ? new Date(birthDate) : null,
      }),
    },
  })
}

export async function deleteClient(id: number, userId: number) {
  const exists = await prisma.client.findFirst({ where: { id, userId } })
  if (!exists) return false
  await prisma.client.delete({ where: { id } })
  return true
}
