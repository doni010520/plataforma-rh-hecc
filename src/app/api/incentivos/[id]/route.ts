import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureIncentiveTables } from '../route';

// GET: program details with eligibilities
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureIncentiveTables();

  try {
    const programs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT * FROM incentive_programs WHERE id = '${params.id}' AND company_id = '${user.companyId}'
    `);
    if (programs.length === 0) return NextResponse.json({ error: 'Programa não encontrado.' }, { status: 404 });

    const eligibilities = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT ie.*, u.name as user_name, u.email as user_email, u.job_title, d.name as department_name
      FROM incentive_eligibilities ie
      JOIN users u ON u.id = ie.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE ie.program_id = '${params.id}'
      ORDER BY ie.eligible DESC, ie.calculated_amount DESC
    `);

    return NextResponse.json({
      program: programs[0],
      eligibilities: eligibilities.map(e => ({
        id: e.id,
        userId: e.user_id,
        userName: e.user_name,
        userEmail: e.user_email,
        jobTitle: e.job_title,
        departmentName: e.department_name,
        eligible: e.eligible,
        calculatedAmount: parseFloat(String(e.calculated_amount || 0)),
        performanceScore: parseFloat(String(e.performance_score || 0)),
        achievementPercentage: parseFloat(String(e.achievement_percentage || 0)),
        notes: e.notes,
      })),
    });
  } catch (err) {
    console.error('[Incentives] Get error:', err);
    return NextResponse.json({ error: 'Erro ao carregar programa.' }, { status: 500 });
  }
}

// PUT: update program
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureIncentiveTables();

  try {
    const { name, type, cyclePeriod, startDate, endDate, totalBudget, status, notes } = await request.json();

    await prisma.$executeRaw`
      UPDATE incentive_programs
      SET name = ${name || ''}, type = ${type || 'PLR'}, cycle_period = ${cyclePeriod || 'ANNUAL'},
          start_date = ${startDate || null}::date, end_date = ${endDate || null}::date,
          total_budget = ${totalBudget || 0}::decimal, status = ${status || 'DRAFT'},
          notes = ${notes || ''}, updated_at = NOW()
      WHERE id = ${params.id} AND company_id = ${user.companyId}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Incentives] Update error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar programa.' }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureIncentiveTables();

  try {
    await prisma.$executeRaw`
      DELETE FROM incentive_programs WHERE id = ${params.id} AND company_id = ${user.companyId}
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Incentives] Delete error:', err);
    return NextResponse.json({ error: 'Erro ao excluir programa.' }, { status: 500 });
  }
}
