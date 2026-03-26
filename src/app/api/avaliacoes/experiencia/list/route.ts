import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureExperienceTables } from '../route';

interface ExperienceEvalRow {
  id: string;
  cycle_id: string;
  target_user_id: string;
  period_days: number;
  admission_date: Date;
  due_date: Date;
  status: string;
  created_at: Date;
  user_name: string;
  user_email: string;
  department_name: string | null;
  cycle_name: string;
  cycle_status: string;
}

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  await ensureExperienceTables();

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const periodFilter = searchParams.get('period');
  const departmentFilter = searchParams.get('departmentId');

  try {
    // First update overdue statuses
    await prisma.$executeRaw`
      UPDATE experience_evaluations
      SET status = 'OVERDUE'
      WHERE company_id = ${user.companyId}
        AND status = 'PENDING'
        AND due_date < NOW()
    `;

    // Also update COMPLETED status based on cycle status
    await prisma.$executeRaw`
      UPDATE experience_evaluations ee
      SET status = 'COMPLETED'
      WHERE ee.company_id = ${user.companyId}
        AND ee.status IN ('PENDING', 'OVERDUE')
        AND EXISTS (
          SELECT 1 FROM review_cycles rc
          WHERE rc.id = ee.cycle_id AND rc.status = 'CLOSED'
        )
    `;

    // Build dynamic query
    let whereClause = `WHERE ee.company_id = '${user.companyId}'`;
    if (statusFilter) {
      whereClause += ` AND ee.status = '${statusFilter}'`;
    }
    if (periodFilter) {
      whereClause += ` AND ee.period_days = ${parseInt(periodFilter)}`;
    }
    if (departmentFilter) {
      whereClause += ` AND u.department_id = '${departmentFilter}'`;
    }

    const rows = await prisma.$queryRawUnsafe<ExperienceEvalRow[]>(`
      SELECT ee.id, ee.cycle_id, ee.target_user_id, ee.period_days,
             ee.admission_date, ee.due_date, ee.status, ee.created_at,
             u.name as user_name, u.email as user_email,
             d.name as department_name,
             rc.name as cycle_name, rc.status as cycle_status
      FROM experience_evaluations ee
      JOIN users u ON u.id = ee.target_user_id
      LEFT JOIN departments d ON d.id = u.department_id
      JOIN review_cycles rc ON rc.id = ee.cycle_id
      ${whereClause}
      ORDER BY ee.created_at DESC
      LIMIT 100
    `);

    // Calculate stats
    const allRows = await prisma.$queryRaw<{ status: string; cnt: string }[]>`
      SELECT status, COUNT(*)::text as cnt
      FROM experience_evaluations
      WHERE company_id = ${user.companyId}
      GROUP BY status
    `;

    const stats = { total: 0, pending: 0, completed: 0, overdue: 0 };
    for (const row of allRows) {
      const count = parseInt(row.cnt);
      stats.total += count;
      if (row.status === 'PENDING') stats.pending = count;
      if (row.status === 'COMPLETED') stats.completed = count;
      if (row.status === 'OVERDUE') stats.overdue = count;
    }

    return NextResponse.json({
      data: rows.map(r => ({
        id: r.id,
        cycleId: r.cycle_id,
        targetUserId: r.target_user_id,
        periodDays: r.period_days,
        admissionDate: r.admission_date,
        dueDate: r.due_date,
        status: r.status,
        createdAt: r.created_at,
        userName: r.user_name,
        userEmail: r.user_email,
        departmentName: r.department_name,
        cycleName: r.cycle_name,
        cycleStatus: r.cycle_status,
      })),
      stats,
    });
  } catch (err) {
    console.error('[Experience List] Error:', err);
    return NextResponse.json({ error: 'Erro ao listar avaliações.' }, { status: 500 });
  }
}
