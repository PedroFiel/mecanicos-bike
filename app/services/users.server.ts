import prisma from "../../prisma/prisma"

export async function getUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      shopName: true,
      whatsappTemplate: true,
    },
  })
}

export async function getShopSettings(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      shopName: true,
      whatsappTemplate: true,
    },
  })
}

export async function updateShopSettings(
  userId: number,
  data: { shopName?: string | null; whatsappTemplate?: string | null }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  })
}

export async function isEmailTaken(email: string, excludeUserId: number) {
  const user = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: excludeUserId },
    },
  })
  return user !== null
}

export async function updateUserProfile(
  id: number,
  data: { name: string; email: string; phone?: string | null; image?: string | null }
) {
  return prisma.user.update({
    where: { id },
    data,
  })
}
