import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const assessment = await prisma.psychosocialAssessment.findFirst({
    where: { id, companyId: user.companyId, status: 'ACTIVE' },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!assessment) {
    return NextResponse.json(
      { error: 'Avaliação não encontrada ou não está ativa.' },
      { status: 404 },
    );
  }

  // Check if user already responded
  const existing = await prisma.psychosocialResponse.findFirst({
    where: { assessmentId: id, userId: user.id },
  });

  return NextResponse.json({
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    anonymous: assessment.anonymous,
    questions: assessment.questions.map((q) => ({
      id: q.id,
      text: q.text,
      category: q.category,
      order: q.order,
    })),
    hasResponded: !!existing,
  });
}
