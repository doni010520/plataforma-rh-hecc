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
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#4f46e5;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">HECC Plataforma RH</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
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
      <td style="background-color:#4f46e5;border-radius:6px;padding:12px 24px;">
        <a href="${escapeHtml(url)}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
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
  loginUrl: string;
}): { subject: string; html: string } {
  const { employeeName, companyName, inviterName, loginUrl } = params;

  return {
    subject: `Você foi convidado(a) para a plataforma RH de ${companyName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:600;">
        Olá, ${escapeHtml(employeeName)}!
      </h2>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
        <strong>${escapeHtml(inviterName)}</strong> convidou você para fazer parte da equipe de
        <strong>${escapeHtml(companyName)}</strong> na HECC Plataforma RH.
      </p>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;">
        Na plataforma você poderá:
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
        <li>Receber e enviar feedbacks</li>
        <li>Participar de avaliações de desempenho</li>
        <li>Gerir seus OKRs</li>
        <li>Responder pesquisas de clima</li>
      </ul>
      <p style="margin:0 0 4px;color:#374151;font-size:14px;">
        Acesse a plataforma para começar:
      </p>
      ${ctaButton('Acessar Plataforma', loginUrl)}
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
      <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:600;">
        Bem-vindo(a), ${escapeHtml(adminName)}!
      </h2>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
        A empresa <strong>${escapeHtml(companyName)}</strong> foi cadastrada com sucesso na HECC Plataforma RH.
      </p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
        Você é o administrador da conta. Comece configurando sua equipe:
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
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
      <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:600;">
        Olá, ${escapeHtml(evaluatorName)}!
      </h2>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
        O ciclo de avaliação <strong>"${escapeHtml(cycleName)}"</strong> foi activado e você tem avaliações pendentes para responder.
      </p>
      <p style="margin:0 0 4px;color:#374151;font-size:14px;line-height:1.6;">
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
      <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:600;">
        Olá, ${escapeHtml(recipientName)}!
      </h2>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
        <strong>${escapeHtml(senderName)}</strong> enviou um <strong>${escapeHtml(feedbackType)}</strong> para você.
      </p>
      <p style="margin:0 0 4px;color:#374151;font-size:14px;line-height:1.6;">
        Acesse a plataforma para visualizar o feedback completo.
      </p>
      ${ctaButton('Ver Feedback', feedbackUrl)}
    `),
  };
}
