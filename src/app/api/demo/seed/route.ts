import { NextResponse } from 'next/server';
import { seedDemoCompany, cleanupDemoCompany } from '@/lib/demo-seed';

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
    return NextResponse.json(
      { error: 'Erro ao criar dados de demonstração.' },
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
