import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureSuccessionTables } from '../route';

// GET: get plan details with candidates
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  await ensureSuccessionTables();

  try {
    const plans = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT sp.*, d.name as department_name, u.name as holder_name
      FROM succession_plans sp
      LEFT JOIN departments d ON d.id = sp.department_id
      LEFT JOIN users u ON u.id = sp.current_holder_id
      WHERE sp.id = '${params.id}' AND sp.company_id = '${user.companyId}'
    `);

    if (plans.length === 0) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    const candidates = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT sc.*, u.name as user_name, u.email as user_email, u.job_title, d.name as dept_name
      FROM succession_candidates sc
      JOIN users u ON u.id = sc.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE sc.plan_id = '${params.id}'
      ORDER BY
        CASE sc.readiness WHEN 'NOW' THEN 0 WHEN '1_YEAR' THEN 1 ELSE 2 END,
        sc.created_at
    `);

    return NextResponse.json({
      plan: plans[0],
      candidates: candidates.map(c => ({
        id: c.id,
        userId: c.user_id,
        userName: c.user_name,
        userEmail: c.user_email,
        jobTitle: c.job_title,
        departmentName: c.dept_name,
        readiness: c.readiness,
        strengths: c.strengths,
        developmentAreas: c.development_areas,
        notes: c.notes,
      })),
    });
  } catch (err) {
    console.error('[Succession] Get error:', err);
    return NextResponse.json({ error: 'Erro ao carregar plano.' }, { status: 500 });
  }
}

// PUT: update plan
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return forbiddenResponse();

  await ensureSuccessionTables();

  try {
    const { positionTitle, departmentId, currentHolderId, priority, status, notes } = await request.json();

    await prisma.$executeRawUnsafe(`
      UPDATE succession_plans
      SET position_title = '${positionTitle?.trim() || ''}',
          department_id = ${departmentId ? `'${departmentId}'` : 'NULL'},
          current_holder_id = ${currentHolderId ? `'${currentHolderId}'` : 'NULL'},
          priority = '${priority || 'MEDIUM'}',
          status = '${status || 'ACTIVE'}',
          notes = '${(notes || '').replace(/'/g, "''")}',
          updated_at = NOW()
      WHERE id = '${params.id}' AND company_id = '${user.companyId}'
    `);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Succession] Update error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar plano.' }, { status: 500 });
  }
}

// DELETE: delete plan (cascades to candidates)
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureSuccessionTables();

  try {
    await prisma.$executeRaw`
      DELETE FROM succession_plans WHERE id = ${params.id} AND company_id = ${user.companyId}
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Succession] Delete error:', err);
    return NextResponse.json({ error: 'Erro ao excluir plano.' }, { status: 500 });
  }
}
