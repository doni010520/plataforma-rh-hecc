import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const assignments = await prisma.reviewAssignment.findMany({
    where: {
      evaluatorId: user.id,
      cycle: { status: 'ACTIVE', companyId: user.companyId },
    },
    include: {
      cycle: { select: { id: true, name: true, endDate: true, type: true } },
      evaluatee: { select: { id: true, name: true, avatarUrl: true } },
      answers: {
        include: { criteria: true },
        orderBy: { criteria: { name: 'asc' } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(assignments);
}
