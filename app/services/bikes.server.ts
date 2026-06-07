import prisma from "../../prisma/prisma"

export async function listBikes(userId: number, clientId?: number) {
  return prisma.bike.findMany({
    where: {
      userId,
      ...(clientId && { clientId }),
    },
    include: { client: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getBikeById(id: number, userId: number) {
  return prisma.bike.findFirst({
    where: { id, userId },
    include: {
      client: { select: { id: true, fullName: true } },
      appointments: {
        orderBy: { serviceDate: "desc" },
        select: { id: true, title: true, serviceDate: true, status: true, totalCost: true },
      },
    },
  })
}

export async function createBike(
  userId: number,
  data: {
    clientId: number
    model: string
    brand?: string | null
    color?: string | null
    frameNumber?: string | null
    characteristics?: string | null
  }
) {
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, userId },
  })
  if (!client) return null

  return prisma.bike.create({
    data: {
      userId,
      clientId: data.clientId,
      model: data.model,
      brand: data.brand || null,
      color: data.color || null,
      frameNumber: data.frameNumber || null,
      characteristics: data.characteristics || null,
    },
  })
}

export async function updateBike(
  id: number,
  userId: number,
  data: {
    model?: string
    brand?: string | null
    color?: string | null
    frameNumber?: string | null
    characteristics?: string | null
  }
) {
  const exists = await prisma.bike.findFirst({ where: { id, userId } })
  if (!exists) return null

  return prisma.bike.update({ where: { id }, data })
}

export async function deleteBike(id: number, userId: number) {
  const exists = await prisma.bike.findFirst({ where: { id, userId } })
  if (!exists) return false
  await prisma.bike.delete({ where: { id } })
  return true
}
