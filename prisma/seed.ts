import "dotenv/config";
import bcrypt from "bcryptjs";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../app/lib/default-services";
import { seedDefaultServices } from "../app/services/service-templates.server";
import { populateShop } from "./demo-data";

const DEMO_EMAIL = "demo@oficina.test";

async function seed() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8 || Buffer.byteLength(password) > 72 || password.startsWith("TROQUE_")) {
    throw new Error("Defina DEMO_PASSWORD com pelo menos 8 caracteres e até 72 bytes.");
  }
  const { default: prisma } = await import("./prisma");
  const hash = await bcrypt.hash(password, 10);
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: DEMO_EMAIL } });
      if (existing && !existing.isDemo) throw new Error("O e-mail da demo pertence a uma conta comum.");
      if (existing) {
        const owned = { userId: existing.id };
        await tx.maintenanceReminder.deleteMany({ where: owned });
        await tx.appointmentItem.deleteMany({ where: { appointment: owned } });
        await tx.appointment.updateMany({ where: owned, data: { parentAppointmentId: null } });
        await tx.appointment.deleteMany({ where: owned });
        await tx.bike.deleteMany({ where: owned });
        await tx.client.deleteMany({ where: owned });
        await tx.serviceTemplate.deleteMany({ where: owned });
        await tx.authToken.deleteMany({ where: owned });
        await tx.securityEvent.deleteMany({ where: owned });
        await tx.user.delete({ where: { id: existing.id } });
      }

      const { id: userId } = await tx.user.create({
        data: {
          email: DEMO_EMAIL, password: hash, name: "Oficina Demo", shopName: "Oficina Demo",
          isDemo: true, whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
        },
      });
      await seedDefaultServices(userId, tx);
      return populateShop(tx, userId, { now });
    }, { timeout: 120_000 });

    console.log(`Conta ${DEMO_EMAIL} recriada.`);
    console.table(result);
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao recriar a conta demo.");
  process.exitCode = 1;
});
