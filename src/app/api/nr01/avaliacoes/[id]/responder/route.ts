import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { awardPoints } from '@/lib/gamification';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const assessment = await prisma.psychosocialAssessment.findFirst({
    where: { id, companyId: user.companyId, status: 'ACTIVE' },
    include: { questions: true },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: 'Avaliação não encontrada ou não está ativa.' },
      { status: 404 },
    );
  }

  // Check date range
  const now = new Date();
  if (assessment.startDate && now < assessment.startDate) {
    return NextResponse.json(
      { error: 'A avaliação ainda não foi iniciada.' },
      { status: 400 },
    );
  }
  if (assessment.endDate && now > assessment.endDate) {
    return NextResponse.json(
      { error: 'O prazo da avaliação já expirou.' },
      { status: 400 },
    );
  }

  // Check if user already responded
  const existing = await prisma.psychosocialResponse.findFirst({
    where: { assessmentId: id, userId: user.id },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Você já respondeu esta avaliação.' },
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

  // Validate all questions are answered
  const questionIds = assessment.questions.map((q) => q.id);
  for (const qId of questionIds) {
    const answer = answers.find((a: { questionId: string }) => a.questionId === qId);
    if (!answer || answer.value === undefined || answer.value === null) {
      return NextResponse.json(
        { error: 'Todas as perguntas devem ser respondidas.' },
        { status: 400 },
      );
    }
  }

  const response = await prisma.psychosocialResponse.create({
    data: {
      assessmentId: id,
      userId: assessment.anonymous ? null : user.id,
      submittedAt: new Date(),
      answers: {
        create: answers.map((a: { questionId: string; value: string }) => ({
          questionId: a.questionId,
          value: a.value,
        })),
      },
    },
    include: { answers: true },
  });

  // Award gamification points automatically
  awardPoints(user.id, user.companyId, 'NR01_COMPLETED', id);

  return NextResponse.json(response, { status: 201 });
}
