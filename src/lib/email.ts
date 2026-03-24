import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'HECC Plataforma RH <noreply@benitechlab.com.br>';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email send');
    throw new Error('RESEND_API_KEY não configurada');
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error('[Email] Failed to send:', JSON.stringify(error));
    throw new Error(error.message || 'Falha ao enviar email');
  }

  console.log('[Email] Sent successfully:', data?.id, 'to:', to);
  return data;
}
