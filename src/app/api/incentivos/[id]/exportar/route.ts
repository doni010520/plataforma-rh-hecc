import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureIncentiveTables } from '@/lib/incentive-tables';

// GET: export eligibilities as CSV
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureIncentiveTables();

  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT ie.eligible, ie.calculated_amount, ie.performance_score, ie.achievement_percentage,
             u.name as user_name, u.email, u.job_title, d.name as department_name
      FROM incentive_eligibilities ie
      JOIN users u ON u.id = ie.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE ie.program_id = '${params.id}'
      ORDER BY u.name
    `);

    // Generate CSV
    const header = 'Nome,Email,Cargo,Departamento,Elegível,Valor Calculado,Score Performance,% Atingimento\n';
    const lines = rows.map(r =>
      `"${r.user_name}","${r.email}","${r.job_title || ''}","${r.department_name || ''}",${r.eligible ? 'Sim' : 'Não'},${r.calculated_amount},${r.performance_score},${r.achievement_percentage}`
    ).join('\n');

    const csv = header + lines;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="incentivos-${params.id}.csv"`,
      },
    });
  } catch (err) {
    console.error('[Incentives Export] Error:', err);
    return NextResponse.json({ error: 'Erro ao exportar.' }, { status: 500 });
  }
}
