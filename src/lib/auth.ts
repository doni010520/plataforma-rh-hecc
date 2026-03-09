import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

export async function getSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { authId: session.id },
    include: { company: true, department: true },
  });

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function getApiUser() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { authId: session.id },
    include: { company: true },
  });

  return user;
}

export function unauthorizedResponse(message = 'Não autorizado.') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Sem permissão para esta ação.') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole);
}
