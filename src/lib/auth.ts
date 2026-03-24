import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

export async function getSession() {
  const supabase = createClient();
  // PERFORMANCE: Use getSession() instead of getUser().
  // getSession() reads the JWT from the cookie locally (instant, no HTTP).
  // getUser() makes an HTTP call to Supabase Auth API (~200-500ms each time).
  // This is SAFE because the middleware already validates the session via
  // getUser() on every request before it reaches this code.
  //
  // The Supabase warning about getSession() being "insecure" does NOT apply
  // here because our middleware guarantees token freshness.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// React.cache() deduplicates calls within the same request lifecycle.
// When AuthenticatedLayout AND the page both call getCurrentUser(),
// only ONE actual DB query + auth check is performed.
export const getCurrentUser = cache(async () => {
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
});

export const getApiUser = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { authId: session.id },
    include: { company: true },
  });

  return user;
});

export function unauthorizedResponse(message = 'Não autorizado.') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Sem permissão para esta ação.') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole);
}
