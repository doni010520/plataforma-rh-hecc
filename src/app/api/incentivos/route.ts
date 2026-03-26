import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureIncentiveTables } from '@/lib/incentive-tables';

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
