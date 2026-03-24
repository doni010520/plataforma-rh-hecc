function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1f2937;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">HECC Plataforma RH</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f3f4f6;border-top:1px solid #374151;">
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">
                Este email foi enviado automaticamente pela HECC Plataforma RH. Não responda.
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

function ctaButton(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);border-radius:8px;padding:14px 28px;">
        <a href="${escapeHtml(url)}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
          ${escapeHtml(text)}
        </a>
      </td>
    </tr>
  </table>`;
}

// ──────────────────────────────────────────────
// 1. Convite de Colaborador
// ──────────────────────────────────────────────

export function colaboradorInviteTemplate(params: {
  employeeName: string;
  companyName: string;
  inviterName: string;
  actionUrl: string;
  actionLabel?: string;
}): { subject: string; html: string } {
  const { employeeName, companyName, inviterName, actionUrl, actionLabel } = params;

  return {
    subject: `${companyName} — Você foi convidado(a) para a Plataforma RH`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#f3f4f6;font-size:20px;font-weight:600;">
        Olá, ${escapeHtml(employeeName)}! 👋
      </h2>
      <p style="margin:0 0 12px;color:#d1d5db;font-size:14px;line-height:1.7;">
        <strong style="color:#10b981;">${escapeHtml(inviterName)}</strong> convidou você para fazer parte da equipe de
        <strong style="color:#10b981;">${escapeHtml(companyName)}</strong> na HECC Plataforma RH.
      </p>
      <p style="margin:0 0 8px;color:#d1d5db;font-size:14px;line-height:1.7;">
        Na plataforma você poderá:
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#d1d5db;font-size:14px;line-height:1.9;">
        <li>Receber e enviar feedbacks</li>
        <li>Participar de avaliações de desempenho</li>
        <li>Gerir seus OKRs e metas</li>
        <li>Responder pesquisas de clima</li>
        <li>Acompanhar seu plano de desenvolvimento</li>
      </ul>
      <p style="margin:0 0 4px;color:#d1d5db;font-size:14px;">
        Clique no botão abaixo para aceitar o convite:
      </p>
      ${ctaButton(actionLabel || 'Aceitar Convite', actionUrl)}
      <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
        Se o botão não funcionar, copie e cole este link no navegador:<br/>
        <a href="${escapeHtml(actionUrl)}" style="color:#10b981;word-break:break-all;">${escapeHtml(actionUrl)}</a>
      </p>
    `),
  };
}

// ──────────────────────────────────────────────
// 2. Confirmação de Cadastro de Empresa
// ──────────────────────────────────────────────

export function registrationConfirmationTemplate(params: {
  adminName: string;
  companyName: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const { adminName, companyName, loginUrl } = params;

  return {
    subject: 'Bem-vindo(a) à HECC Plataforma RH!',
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#f3f4f6;font-size:18px;font-weight:600;">
        Bem-vindo(a), ${escapeHtml(adminName)}!
      </h2>
      <p style="margin:0 0 12px;color:#d1d5db;font-size:14px;line-height:1.6;">
        A empresa <strong>${escapeHtml(companyName)}</strong> foi cadastrada com sucesso na HECC Plataforma RH.
      </p>
      <p style="margin:0 0 12px;color:#d1d5db;font-size:14px;line-height:1.6;">
        Você é o administrador da conta. Comece configurando sua equipe:
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#d1d5db;font-size:14px;line-height:1.8;">
        <li>Crie departamentos para organizar a empresa</li>
        <li>Adicione colaboradores e gestores</li>
        <li>Configure ciclos de avaliação de desempenho</li>
        <li>Defina OKRs e metas para a equipe</li>
      </ul>
      ${ctaButton('Acessar Dashboard', loginUrl)}
    `),
  };
}

// ──────────────────────────────────────────────
// 3. Notificação de Avaliação Pendente
// ──────────────────────────────────────────────

export function evaluationPendingTemplate(params: {
  evaluatorName: string;
  cycleName: string;
  evaluationUrl: string;
}): { subject: string; html: string } {
  const { evaluatorName, cycleName, evaluationUrl } = params;

  return {
    subject: `Avaliação pendente: ${cycleName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#f3f4f6;font-size:18px;font-weight:600;">
        Olá, ${escapeHtml(evaluatorName)}!
      </h2>
      <p style="margin:0 0 12px;color:#d1d5db;font-size:14px;line-height:1.6;">
        O ciclo de avaliação <strong>"${escapeHtml(cycleName)}"</strong> foi ativado e você tem avaliações pendentes para responder.
      </p>
      <p style="margin:0 0 4px;color:#d1d5db;font-size:14px;line-height:1.6;">
        Por favor, acesse a plataforma e complete suas avaliações o mais breve possível.
      </p>
      ${ctaButton('Responder Avaliações', evaluationUrl)}
    `),
  };
}

// ──────────────────────────────────────────────
// 4. Notificação de Feedback Recebido
// ──────────────────────────────────────────────

export function feedbackReceivedTemplate(params: {
  recipientName: string;
  senderName: string;
  feedbackType: string;
  feedbackUrl: string;
}): { subject: string; html: string } {
  const { recipientName, senderName, feedbackType, feedbackUrl } = params;

  return {
    subject: `Novo ${feedbackType} recebido`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#f3f4f6;font-size:18px;font-weight:600;">
        Olá, ${escapeHtml(recipientName)}!
      </h2>
      <p style="margin:0 0 12px;color:#d1d5db;font-size:14px;line-height:1.6;">
        <strong>${escapeHtml(senderName)}</strong> enviou um <strong>${escapeHtml(feedbackType)}</strong> para você.
      </p>
      <p style="margin:0 0 4px;color:#d1d5db;font-size:14px;line-height:1.6;">
        Acesse a plataforma para visualizar o feedback completo.
      </p>
      ${ctaButton('Ver Feedback', feedbackUrl)}
    `),
  };
}
