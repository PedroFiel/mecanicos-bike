import prisma from "prisma/prisma";
import { getClientIp } from "~/lib/rate-limit.server";

export type SecurityEventType =
  | "login_success"
  | "login_failed"
  | "login_blocked"
  | "logout"
  | "2fa_sent"
  | "2fa_failed"
  | "password_reset_requested"
  | "password_reset_used";

/** Registra um evento de segurança com IP e user agent da requisição. */
export async function logSecurityEvent(request: Request, type: SecurityEventType, userId?: number | null) {
  await prisma.securityEvent.create({
    data: {
      userId: userId ?? null,
      type,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? undefined,
    },
  });
}
