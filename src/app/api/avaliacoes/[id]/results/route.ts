import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: { criteria: { orderBy: { name: 'asc' } } },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo não encontrado.' }, { status: 404 });
  }

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Colaboradores não podem acessar relatórios de ciclo.');
  }

  const assignments = await prisma.reviewAssignment.findMany({
    where: { cycleId: params.id, status: 'DONE' },
    include: {
      evaluator: {
        select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
      },
      evaluatee: {
        select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
      },
      answers: { include: { criteria: true } },
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
    return NextResponse.json({
      cycle,
      assignments: filtered,
      summary: buildSummary(filtered, cycle.criteria),
    });
  }

  return NextResponse.json({
    cycle,
    assignments,
    summary: buildSummary(assignments, cycle.criteria),
  });
}

interface CriteriaInfo {
  id: string;
  name: string;
  weight: number;
}

function buildSummary(
  assignments: Array<{
    evaluateeId: string;
    evaluatee: { id: string; name: string; departmentId: string | null; department: { name: string } | null };
    answers: Array<{ criteria: { id: string; name: string; weight: number }; score: number | null }>;
  }>,
  criteria: CriteriaInfo[],
) {
  const byEvaluatee: Record<
    string,
    {
      name: string;
      departmentName: string | null;
      scores: Record<string, number[]>;
      avgScore: number;
    }
  > = {};

  for (const assignment of assignments) {
    const eId = assignment.evaluateeId;
    if (!byEvaluatee[eId]) {
      byEvaluatee[eId] = {
        name: assignment.evaluatee.name,
        departmentName: assignment.evaluatee.department?.name || null,
        scores: {},
        avgScore: 0,
      };
    }

    for (const answer of assignment.answers) {
      if (answer.score !== null) {
        if (!byEvaluatee[eId].scores[answer.criteria.id]) {
          byEvaluatee[eId].scores[answer.criteria.id] = [];
        }
        byEvaluatee[eId].scores[answer.criteria.id].push(answer.score);
      }
    }
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  for (const eId of Object.keys(byEvaluatee)) {
    let weightedSum = 0;
    for (const c of criteria) {
      const scores = byEvaluatee[eId].scores[c.id] || [];
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        weightedSum += avg * (c.weight / totalWeight);
      }
    }
    byEvaluatee[eId].avgScore = Math.round(weightedSum * 100) / 100;
  }

  const byDepartment: Record<string, { scores: number[]; avg: number }> = {};
  for (const eId of Object.keys(byEvaluatee)) {
    const dept = byEvaluatee[eId].departmentName || 'Sem departamento';
    if (!byDepartment[dept]) byDepartment[dept] = { scores: [], avg: 0 };
    if (byEvaluatee[eId].avgScore > 0) {
      byDepartment[dept].scores.push(byEvaluatee[eId].avgScore);
    }
  }
  for (const dept of Object.keys(byDepartment)) {
    const scores = byDepartment[dept].scores;
    byDepartment[dept].avg =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;
  }

  return { byEvaluatee, byDepartment };
}
