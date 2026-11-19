export function normalizePhoneBR(phone?: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const national = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (!/^[1-9][0-9](?:[2-5]\d{7}|9\d{8})$/.test(national)) return null;
  return `55${national}`;
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: string) =>
    Object.hasOwn(variables, key) ? variables[key] : match,
  );
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  const number = normalizePhoneBR(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
