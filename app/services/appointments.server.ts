import prisma from "../../prisma/prisma"

type AppointmentStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO"

export async function listAppointments(
  userId: number,
  filters: { clientId?: number; status?: AppointmentStatus } = {}
) {
  return prisma.appointment.findMany({
    where: {
      userId,
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.status && { status: filters.status }),
    },
    include: {
      client: { select: { id: true, fullName: true } },
      bike: { select: { id: true, model: true, brand: true } },
    },
    orderBy: { serviceDate: "desc" },
  })
}

export async function getAppointmentById(id: number, userId: number) {
  return prisma.appointment.findFirst({
    where: { id, userId },
    include: {
      client: {
        include: { bikes: { select: { id: true, model: true, brand: true } } },
      },
      bike: true,
      serviceDetails: true,
    },
  })
}

export async function createAppointment(
  userId: number,
  data: {
    clientId: number
    bikeId: number
    title: string
    description?: string | null
    serviceDate: string
    status: AppointmentStatus
    totalCost?: number | null
  }
) {
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, userId },
  })
  if (!client) return null

  const bike = await prisma.bike.findFirst({
    where: { id: data.bikeId, userId },
  })
  if (!bike) return null

  return prisma.appointment.create({
    data: {
      userId,
      clientId: data.clientId,
      bikeId: data.bikeId,
      title: data.title,
      description: data.description || null,
      serviceDate: new Date(data.serviceDate),
      status: data.status,
      totalCost: data.totalCost ?? null,
    },
  })
}

export async function updateAppointment(
  id: number,
  userId: number,
  data: {
    title?: string
    description?: string | null
    serviceDate?: string
    status?: AppointmentStatus
    totalCost?: number | null
    bikeId?: number
  }
) {
  const exists = await prisma.appointment.findFirst({ where: { id, userId } })
  if (!exists) return null

  const { serviceDate, ...rest } = data
  return prisma.appointment.update({
    where: { id },
    data: {
      ...rest,
      ...(serviceDate && { serviceDate: new Date(serviceDate) }),
    },
  })
}

export async function deleteAppointment(id: number, userId: number) {
  const exists = await prisma.appointment.findFirst({ where: { id, userId } })
  if (!exists) return false
  await prisma.serviceDetail.deleteMany({ where: { appointmentId: id } })
  await prisma.appointment.delete({ where: { id } })
  return true
}
