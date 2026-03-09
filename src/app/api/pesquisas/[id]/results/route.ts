import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse('Apenas gestores e administradores podem ver resultados.');
  }

  const survey = await prisma.survey.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 });
  }

  // Total active users in company
  const totalUsers = await prisma.user.count({
    where: { companyId: user.companyId, active: true },
  });

  // Total responses
  const totalResponses = await prisma.surveyResponse.count({
    where: { surveyId: params.id },
  });

  // Response rate by department
  const departments = await prisma.department.findMany({
    where: { companyId: user.companyId },
    include: {
      users: {
        where: { active: true },
        select: { id: true },
      },
    },
  });

  // Get all responses with user department info
  const responsesWithDept = await prisma.surveyResponse.findMany({
    where: { surveyId: params.id },
    include: {
      user: {
        select: { departmentId: true },
      },
    },
  });

  const departmentStats = departments.map((dept) => {
    const deptUserIds = dept.users.map((u) => u.id);
    const deptResponses = responsesWithDept.filter(
      (r) => r.user && deptUserIds.includes(r.user.departmentId || ''),
    );
    return {
      name: dept.name,
      totalUsers: deptUserIds.length,
      responses: deptResponses.length,
      rate: deptUserIds.length > 0 ? (deptResponses.length / deptUserIds.length) * 100 : 0,
    };
  });

  // Answers aggregation per question
  const allAnswers = await prisma.surveyAnswer.findMany({
    where: {
      response: { surveyId: params.id },
    },
    include: {
      question: true,
    },
  });

  const questionResults = survey.questions.map((q) => {
    const qAnswers = allAnswers.filter((a) => a.questionId === q.id);

    if (q.type === 'SCALE') {
      const values = qAnswers.map((a) => parseInt(a.value)).filter((v) => !isNaN(v));
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const distribution: Record<number, number> = {};
      for (let i = 1; i <= 5; i++) distribution[i] = 0;
      values.forEach((v) => { if (distribution[v] !== undefined) distribution[v]++; });
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        totalAnswers: values.length,
        avg,
        distribution,
      };
    }

    if (q.type === 'MULTIPLE_CHOICE') {
      const options: string[] = JSON.parse(q.options);
      const distribution: Record<string, number> = {};
      options.forEach((opt) => { distribution[opt] = 0; });
      qAnswers.forEach((a) => {
        if (distribution[a.value] !== undefined) {
          distribution[a.value]++;
        }
      });
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        totalAnswers: qAnswers.length,
        distribution,
      };
    }

    // TEXT
    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      totalAnswers: qAnswers.length,
      answers: qAnswers.map((a) => a.value),
    };
  });

  return NextResponse.json({
    survey: {
      id: survey.id,
      title: survey.title,
      type: survey.type,
      status: survey.status,
      anonymous: survey.anonymous,
    },
    totalUsers,
    totalResponses,
    responseRate: totalUsers > 0 ? (totalResponses / totalUsers) * 100 : 0,
    departmentStats,
    questionResults,
  });
}
