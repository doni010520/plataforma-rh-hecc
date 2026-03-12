import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const assessment = await prisma.discAssessment.findFirst({
    where: {
      userId: user.id,
      companyId: user.companyId,
      completedAt: { not: null },
    },
    orderBy: { completedAt: 'desc' },
  });

  if (!assessment) {
    return NextResponse.json({ assessment: null });
  }

  return NextResponse.json({ assessment });
}

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const assessment = await prisma.discAssessment.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
    },
  });

  return NextResponse.json(assessment, { status: 201 });
}
