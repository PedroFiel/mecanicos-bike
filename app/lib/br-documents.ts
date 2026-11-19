/** Mantém apenas os dígitos de um texto (CPF, telefone etc.). */
export function onlyDigits(value?: string | null): string {
  return value?.replace(/\D/g, "") ?? "";
}

/** Valida um CPF pelos dígitos verificadores. Aceita com ou sem máscara. */
export function isValidCPF(value?: string | null): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index++) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/** CPF só com dígitos, ou null quando vazio. */
export function normalizeCPF(value?: string | null): string | null {
  return onlyDigits(value) || null;
}

/** Telefone só com dígitos, ou null quando vazio. */
export function normalizePhone(value?: string | null): string | null {
  return onlyDigits(value) || null;
}
