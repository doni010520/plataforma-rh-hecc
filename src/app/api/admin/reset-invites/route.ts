import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// DELETE /api/admin/reset-invites
// Removes all users except the requesting admin from both DB and Supabase Auth.
// This allows re-inviting the same emails.
export async function DELETE(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  // Extra confirmation required — must pass header X-Confirm: RESET
  const confirm = request.headers.get('X-Confirm');
  if (confirm !== 'RESET') {
    return NextResponse.json(
      { error: 'Confirmação obrigatória. Envie o header X-Confirm: RESET' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Find all users in this company except the requesting admin
  const usersToDelete = await prisma.user.findMany({
    where: {
      companyId: user.companyId,
      id: { not: user.id },
    },
    select: { id: true, authId: true, name: true, email: true },
  });

  if (usersToDelete.length === 0) {
    return NextResponse.json({ message: 'Nenhum colaborador para remover.', deleted: 0 });
  }

  const results: { email: string; dbDeleted: boolean; authDeleted: boolean; error?: string }[] = [];

  for (const u of usersToDelete) {
    let dbDeleted = false;
    let authDeleted = false;
    let error: string | undefined;

    try {
      // Delete from app DB first (cascade deletes related records)
      await prisma.user.delete({ where: { id: u.id } });
      dbDeleted = true;
    } catch (e) {
      error = `DB: ${e instanceof Error ? e.message : String(e)}`;
    }

    try {
      // Delete from Supabase Auth
      if (u.authId) {
        const { error: authError } = await supabase.auth.admin.deleteUser(u.authId);
        if (authError) {
          error = (error ? error + ' | ' : '') + `Auth: ${authError.message}`;
        } else {
          authDeleted = true;
        }
      }
    } catch (e) {
      error = (error ? error + ' | ' : '') + `Auth: ${e instanceof Error ? e.message : String(e)}`;
    }

    results.push({ email: u.email, dbDeleted, authDeleted, error });
  }

  return NextResponse.json({
    message: `${results.filter(r => r.dbDeleted).length} de ${usersToDelete.length} colaboradores removidos.`,
    deleted: results.filter(r => r.dbDeleted).length,
    details: results,
  });
}
