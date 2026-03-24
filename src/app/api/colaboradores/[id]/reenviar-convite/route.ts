import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { colaboradorInviteTemplate } from '@/lib/email-templates';
import { NextResponse } from 'next/server';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const colaborador = await prisma.user.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!colaborador) {
      return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plataforma-rh-hecc.vercel.app';
    const supabase = getSupabaseAdmin();

    // Generate a new invite link without Supabase sending its default email
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'invite',
        email: colaborador.email,
        options: { redirectTo: `${appUrl}/auth/confirmar` },
      });

    if (linkError) {
      // Fallback: generate a recovery/password-reset link instead
      const { data: recoveryData, error: recoveryError } =
        await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: colaborador.email,
          options: { redirectTo: `${appUrl}/auth/confirmar` },
        });

      if (recoveryError || !recoveryData) {
        return NextResponse.json(
          { error: 'Erro ao gerar link de convite. Tente novamente.' },
          { status: 500 },
        );
      }

      const recoveryLink = recoveryData.properties?.action_link || `${appUrl}/login`;
      const { subject, html } = colaboradorInviteTemplate({
        employeeName: colaborador.name,
        companyName: user.company.name,
        inviterName: user.name,
        actionUrl: recoveryLink,
        actionLabel: 'Definir Senha e Acessar',
      });
      await sendEmail({ to: colaborador.email, subject, html });

      return NextResponse.json({ success: true });
    }

    const inviteLink = linkData.properties?.action_link || `${appUrl}/login`;
    const { subject, html } = colaboradorInviteTemplate({
      employeeName: colaborador.name,
      companyName: user.company.name,
      inviterName: user.name,
      actionUrl: inviteLink,
      actionLabel: 'Aceitar Convite e Criar Senha',
    });
    await sendEmail({ to: colaborador.email, subject, html });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Resend invite error:', message);
    return NextResponse.json(
      { error: `Erro ao reenviar convite: ${message}` },
      { status: 500 },
    );
  }
}
