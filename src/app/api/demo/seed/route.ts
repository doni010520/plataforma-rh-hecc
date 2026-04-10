import { NextResponse } from 'next/server';
import { seedDemoCompany, cleanupDemoCompany } from '@/lib/demo-seed';

// Increase function timeout for the seed (Pro plan allows 60s, Hobby 10s)
export const maxDuration = 60;

// POST /api/demo/seed — create/reset demo company
// Requires CRON_SECRET or X-Admin-Key header for security
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const adminKey = request.headers.get('x-admin-key');
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron = authHeader === `Bearer ${cronSecret}`;
  const isManualAdmin = adminKey === cronSecret;

  if (!isVercelCron && !isManualAdmin) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const result = await seedDemoCompany();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[Demo Seed] Error:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : '';
    return NextResponse.json(
      {
        error: 'Erro ao criar dados de demonstração.',
        details: message,
        stack,
      },
      { status: 500 },
    );
  }
}

// GET /api/demo/seed — same as POST (for Vercel cron compatibility)
export async function GET(request: Request) {
  return POST(request);
}

// DELETE /api/demo/seed — cleanup only (no reseed)
export async function DELETE(request: Request) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    await cleanupDemoCompany();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao limpar.' }, { status: 500 });
  }
}
