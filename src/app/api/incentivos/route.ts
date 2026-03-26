import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function ensureIncentiveTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS incentive_programs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'PLR',
        cycle_period TEXT NOT NULL DEFAULT 'ANNUAL',
        status TEXT NOT NULL DEFAULT 'DRAFT',
        start_date DATE,
        end_date DATE,
        eligibility_criteria JSONB DEFAULT '{}',
        total_budget DECIMAL(12,2) DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS incentive_eligibilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES incentive_programs(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        eligible BOOLEAN NOT NULL DEFAULT true,
        calculated_amount DECIMAL(12,2) DEFAULT 0,
        performance_score DECIMAL(5,2) DEFAULT 0,
        achievement_percentage DECIMAL(5,2) DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(program_id, user_id)
      )
    `);
  } catch { /* Tables likely exist */ }
}

// GET: list all incentive programs
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureIncentiveTables();

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT ip.*,
        (SELECT COUNT(*)::text FROM incentive_eligibilities ie WHERE ie.program_id = ip.id) as eligible_count,
        (SELECT COALESCE(SUM(ie.calculated_amount), 0)::text FROM incentive_eligibilities ie WHERE ie.program_id = ip.id AND ie.eligible = true) as total_distributed
      FROM incentive_programs ip
      WHERE ip.company_id = '${user.companyId}'
      ORDER BY ip.created_at DESC
    `);

    return NextResponse.json({
      data: rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        cyclePeriod: r.cycle_period,
        status: r.status,
        startDate: r.start_date,
        endDate: r.end_date,
        eligibilityCriteria: r.eligibility_criteria,
        totalBudget: parseFloat(String(r.total_budget || 0)),
        eligibleCount: parseInt(String(r.eligible_count || 0)),
        totalDistributed: parseFloat(String(r.total_distributed || 0)),
        notes: r.notes,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[Incentives] List error:', err);
    return NextResponse.json({ error: 'Erro ao listar programas.' }, { status: 500 });
  }
}

// POST: create incentive program
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureIncentiveTables();

  try {
    const { name, type, cyclePeriod, startDate, endDate, totalBudget, eligibilityCriteria, notes } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do programa é obrigatório.' }, { status: 400 });
    }

    const criteriaJson = JSON.stringify(eligibilityCriteria || {});

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO incentive_programs (company_id, name, type, cycle_period, start_date, end_date, total_budget, eligibility_criteria, notes)
      VALUES (${user.companyId}, ${name.trim()}, ${type || 'PLR'}, ${cyclePeriod || 'ANNUAL'},
              ${startDate || null}::date, ${endDate || null}::date,
              ${totalBudget || 0}::decimal, ${criteriaJson}::jsonb, ${notes?.trim() || ''})
      RETURNING id
    `;

    return NextResponse.json({ id: rows[0].id, success: true }, { status: 201 });
  } catch (err) {
    console.error('[Incentives] Create error:', err);
    return NextResponse.json({ error: 'Erro ao criar programa.' }, { status: 500 });
  }
}
