/**
 * email-templates.server.ts
 *
 * Templates HTML para e-mails transacionais do sistema Mecânicos Bike.
 * Cada função retorna o HTML do corpo do e-mail.
 * Use com sendEmail() de ~/lib/email.server.
 *
 * Estilo inline para máxima compatibilidade com clientes de e-mail.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function baseLayout(title: string, officeName: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                🔧 Mecânicos Bike
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                ${officeName} — Sistema Mecânicos Bike
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Exports ────────────────────────────────────────────────────────────────

/**
 * E-mail com código de verificação 2FA.
 * Assunto sugerido: `Código de acesso — ${officeName}`
 */
export function twoFactorCodeEmail(code: string, officeName: string): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Código de acesso</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">
      Use o código abaixo para concluir o seu login em <strong>${officeName}</strong>:
    </p>

    <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;font-size:40px;font-weight:800;letter-spacing:12px;color:#1d4ed8;font-family:'Courier New',Courier,monospace;">
        ${code}
      </span>
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
      ⏱ Este código expira em <strong>10 minutos</strong>.
    </p>
    <p style="margin:0;font-size:14px;color:#6b7280;">
      Se você não tentou fazer login, pode ignorar este e-mail com segurança — sua conta continua protegida.
    </p>
  `;

  return baseLayout(`Código de acesso — ${officeName}`, officeName, body);
}

/**
 * E-mail com link para redefinição de senha.
 * Assunto sugerido: `Redefinição de senha — ${officeName}`
 */
export function passwordResetEmail(resetUrl: string, officeName: string): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Redefinição de senha</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">
      Recebemos uma solicitação para redefinir a senha da sua conta em <strong>${officeName}</strong>.
      Clique no botão abaixo para criar uma nova senha:
    </p>

    <div style="text-align:center;margin:0 0 24px;">
      <a href="${resetUrl}"
        style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;
               text-decoration:none;padding:14px 32px;border-radius:6px;">
        Redefinir senha
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
      Ou copie e cole o link abaixo no seu navegador:
    </p>
    <p style="margin:0 0 20px;font-size:12px;color:#94a3b8;word-break:break-all;">
      ${resetUrl}
    </p>

    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
      ⏱ Este link expira em <strong>30 minutos</strong>.
    </p>
    <p style="margin:0;font-size:14px;color:#6b7280;">
      Se você não solicitou a redefinição de senha, pode ignorar este e-mail — sua senha permanece a mesma.
    </p>
  `;

  return baseLayout(`Redefinição de senha — ${officeName}`, officeName, body);
}

/**
 * E-mail de aviso de senha alterada com sucesso.
 * Assunto sugerido: `Sua senha foi alterada — ${officeName}`
 */
export function passwordChangedEmail(officeName: string): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Senha alterada</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">
      A senha da sua conta em <strong>${officeName}</strong> foi alterada com sucesso.
    </p>

    <div style="background:#fef9c3;border-left:4px solid #ca8a04;border-radius:4px;padding:16px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#713f12;">
        ⚠️ Se você <strong>não</strong> realizou esta alteração, entre em contato imediatamente com o
        administrador do sistema para que sua conta seja protegida.
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:#6b7280;">
      Se foi você quem alterou a senha, nenhuma ação adicional é necessária.
    </p>
  `;

  return baseLayout(`Sua senha foi alterada — ${officeName}`, officeName, body);
}
