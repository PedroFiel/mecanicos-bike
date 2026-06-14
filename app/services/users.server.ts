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
    },
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
