import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: { criteria: { orderBy: { name: 'asc' } } },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo não encontrado.' }, { status: 404 });
  }

  const assignments = await prisma.reviewAssignment.findMany({
    where: { cycleId: params.id, status: 'DONE' },
    include: {
      evaluator: {
        select: { name: true, department: { select: { name: true } } },
      },
      evaluatee: {
        select: { name: true, department: { select: { name: true } } },
      },
      answers: { include: { criteria: true }, orderBy: { criteria: { name: 'asc' } } },
    },
  });

  if (user.role === 'MANAGER') {
    const subordinateIds = (
      await prisma.user.findMany({
        where: { managerId: user.id, companyId: user.companyId },
        select: { id: true },
      })
    ).map((u) => u.id);

    const filtered = assignments.filter((a) => subordinateIds.includes(a.evaluateeId));
    return buildCsv(cycle, filtered);
  }

  return buildCsv(cycle, assignments);
}

function buildCsv(
  cycle: { name: string; criteria: Array<{ name: string }> },
  assignments: Array<{
    evaluator: { name: string; department: { name: string } | null };
    evaluatee: { name: string; department: { name: string } | null };
    answers: Array<{ criteria: { name: string }; score: number | null; comment: string }>;
  }>,
) {
  const headers = [
    'Avaliador',
    'Dept. Avaliador',
    'Avaliado',
    'Dept. Avaliado',
    ...cycle.criteria.flatMap((c) => [`${c.name} (Nota)`, `${c.name} (Comentário)`]),
  ];

  const rows = assignments.map((a) => {
    const base = [
      a.evaluator.name,
      a.evaluator.department?.name || '',
      a.evaluatee.name,
      a.evaluatee.department?.name || '',
    ];
    const answerCols = a.answers.flatMap((ans) => [
      ans.score?.toString() || '',
      `"${(ans.comment || '').replace(/"/g, '""')}"`,
    ]);
    return [...base, ...answerCols];
  });

  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="avaliacao-${cycle.name.replace(/\s+/g, '-').toLowerCase()}.csv"`,
    },
  });
}
