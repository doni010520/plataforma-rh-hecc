import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureSuccessionTables } from '@/lib/succession-tables';

// POST: add candidate to plan
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return forbiddenResponse();

  await ensureSuccessionTables();

  try {
    const { userId, readiness, strengths, developmentAreas, notes } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Colaborador é obrigatório.' }, { status: 400 });
    }

    // Verify user belongs to same company
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, companyId: user.companyId, active: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 });
    }

    const r = readiness || '1_YEAR';
    const s = strengths?.trim() || '';
    const d = developmentAreas?.trim() || '';
    const n = notes?.trim() || '';

    await prisma.$executeRaw`
      INSERT INTO succession_candidates (plan_id, user_id, readiness, strengths, development_areas, notes)
      VALUES (${params.id}::uuid, ${userId}, ${r}, ${s}, ${d}, ${n})
      ON CONFLICT (plan_id, user_id) DO UPDATE
      SET readiness = ${r}, strengths = ${s}, development_areas = ${d}, notes = ${n}
    `;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[Succession Candidate] Add error:', err);
    return NextResponse.json({ error: 'Erro ao adicionar candidato.' }, { status: 500 });
  }
}

// DELETE: remove candidate from plan
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return forbiddenResponse();

  await ensureSuccessionTables();

  try {
    const { candidateId } = await request.json();

    if (!candidateId) {
      return NextResponse.json({ error: 'ID do candidato é obrigatório.' }, { status: 400 });
    }

    await prisma.$executeRaw`
      DELETE FROM succession_candidates WHERE id = ${candidateId}::uuid
      AND plan_id = ${params.id}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Succession Candidate] Delete error:', err);
    return NextResponse.json({ error: 'Erro ao remover candidato.' }, { status: 500 });
  }
}
