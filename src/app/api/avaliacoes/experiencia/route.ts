import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// Ensure all experience evaluation tables + columns exist
export async function ensureExperienceTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS experience_eval_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        periods JSONB NOT NULL DEFAULT '[30,45,60,90]',
        template_cycle_id TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS experience_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL,
        target_user_id TEXT NOT NULL,
        period_days INT NOT NULL,
        admission_date TIMESTAMPTZ NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, target_user_id, period_days)
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_date TIMESTAMPTZ
    `);
  } catch {
    // Tables likely already exist
  }
}

interface ConfigRow {
  periods: number[];
  template_cycle_id: string | null;
  active: boolean;
}

// GET: return experience eval config for company
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  await ensureExperienceTables();

  try {
    const rows = await prisma.$queryRaw<ConfigRow[]>`
      SELECT periods, template_cycle_id, active
      FROM experience_eval_configs
      WHERE company_id = ${user.companyId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        periods: [30, 45, 60, 90],
        templateCycleId: null,
        active: false,
      });
    }

    const config = rows[0];
    return NextResponse.json({
      periods: config.periods,
      templateCycleId: config.template_cycle_id,
      active: config.active,
    });
  } catch {
    return NextResponse.json({
      periods: [30, 45, 60, 90],
      templateCycleId: null,
      active: false,
    });
  }
}

// PUT: save experience eval config
export async function PUT(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureExperienceTables();

  try {
    const { periods, templateCycleId, active } = await request.json() as {
      periods: number[];
      templateCycleId?: string | null;
      active: boolean;
    };

    if (!Array.isArray(periods) || periods.some(p => typeof p !== 'number' || p < 1)) {
      return NextResponse.json({ error: 'Períodos inválidos.' }, { status: 400 });
    }

    const periodsJson = JSON.stringify(periods);
    const templateId = templateCycleId || null;

    await prisma.$executeRaw`
      INSERT INTO experience_eval_configs (company_id, periods, template_cycle_id, active, updated_at)
      VALUES (${user.companyId}, ${periodsJson}::jsonb, ${templateId}, ${active}, NOW())
      ON CONFLICT (company_id)
      DO UPDATE SET periods = ${periodsJson}::jsonb, template_cycle_id = ${templateId}, active = ${active}, updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Experience Config] Save error:', err);
    return NextResponse.json({ error: 'Erro ao salvar configuração.' }, { status: 500 });
  }
}
