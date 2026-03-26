import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

async function ensureSuccessionTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS succession_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        position_title TEXT NOT NULL,
        department_id TEXT,
        current_holder_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS succession_candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES succession_plans(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        readiness TEXT NOT NULL DEFAULT '1_YEAR',
        strengths TEXT DEFAULT '',
        development_areas TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(plan_id, user_id)
      )
    `);
  } catch {
    // Tables likely exist
  }
}

export { ensureSuccessionTables };

interface PlanRow {
  id: string;
  company_id: string;
  position_title: string;
  department_id: string | null;
  current_holder_id: string | null;
  status: string;
  priority: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
  department_name: string | null;
  holder_name: string | null;
  candidate_count: string;
}

// GET: list all succession plans for company
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  await ensureSuccessionTables();

  try {
    const rows = await prisma.$queryRawUnsafe<PlanRow[]>(`
      SELECT sp.*,
        d.name as department_name,
        u.name as holder_name,
        (SELECT COUNT(*)::text FROM succession_candidates sc WHERE sc.plan_id = sp.id) as candidate_count
      FROM succession_plans sp
      LEFT JOIN departments d ON d.id = sp.department_id
      LEFT JOIN users u ON u.id = sp.current_holder_id
      WHERE sp.company_id = '${user.companyId}'
      ORDER BY
        CASE sp.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        sp.created_at DESC
    `);

    return NextResponse.json({
      data: rows.map(r => ({
        id: r.id,
        positionTitle: r.position_title,
        departmentId: r.department_id,
        departmentName: r.department_name,
        currentHolderId: r.current_holder_id,
        currentHolderName: r.holder_name,
        status: r.status,
        priority: r.priority,
        notes: r.notes,
        candidateCount: parseInt(r.candidate_count),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[Succession] List error:', err);
    return NextResponse.json({ error: 'Erro ao listar planos.' }, { status: 500 });
  }
}

// POST: create a new succession plan
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return forbiddenResponse();

  await ensureSuccessionTables();

  try {
    const { positionTitle, departmentId, currentHolderId, priority, notes } = await request.json();

    if (!positionTitle?.trim()) {
      return NextResponse.json({ error: 'Título da posição é obrigatório.' }, { status: 400 });
    }

    const pTitle = positionTitle.trim();
    const deptId = departmentId || null;
    const holderId = currentHolderId || null;
    const prio = priority || 'MEDIUM';
    const planNotes = notes?.trim() || '';

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO succession_plans (company_id, position_title, department_id, current_holder_id, priority, notes)
      VALUES (${user.companyId}, ${pTitle}, ${deptId}, ${holderId}, ${prio}, ${planNotes})
      RETURNING id
    `;

    return NextResponse.json({ id: rows[0].id, success: true }, { status: 201 });
  } catch (err) {
    console.error('[Succession] Create error:', err);
    return NextResponse.json({ error: 'Erro ao criar plano.' }, { status: 500 });
  }
}
