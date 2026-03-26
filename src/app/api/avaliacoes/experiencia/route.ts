import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureExperienceTables } from '@/lib/experience-tables';

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
