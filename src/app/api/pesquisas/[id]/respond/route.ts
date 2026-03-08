import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const survey = await prisma.survey.findFirst({
    where: { id: params.id, companyId: user.companyId, status: 'ACTIVE' },
    include: { questions: true },
  });

  if (!survey) {
    return NextResponse.json(
      { error: 'Pesquisa não encontrada ou não está activa.' },
      { status: 404 },
    );
  }

  // Check if user already responded
  const existing = await prisma.surveyResponse.findFirst({
    where: { surveyId: params.id, userId: user.id },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Você já respondeu esta pesquisa.' },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { answers } = body;

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: 'Respostas são obrigatórias.' },
      { status: 400 },
    );
  }

  // Validate all required questions are answered
  const questionIds = survey.questions.map((q) => q.id);
  for (const qId of questionIds) {
    const answer = answers.find((a: { questionId: string }) => a.questionId === qId);
    if (!answer || !answer.value) {
      return NextResponse.json(
        { error: 'Todas as perguntas devem ser respondidas.' },
        { status: 400 },
      );
    }
  }

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: params.id,
      userId: survey.anonymous ? null : user.id,
      answers: {
        create: answers.map((a: { questionId: string; value: string }) => ({
          questionId: a.questionId,
          value: a.value,
        })),
      },
    },
    include: { answers: true },
  });

  return NextResponse.json(response, { status: 201 });
}
