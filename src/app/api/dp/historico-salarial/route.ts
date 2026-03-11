import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (user.role === 'EMPLOYEE') {
    where.userId = user.id;
  } else if (userId) {
    where.userId = userId;
  }

  const history = await prisma.salaryHistory.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { effectiveDate: 'desc' },
  });

  return NextResponse.json(history);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { userId, previousSalary, newSalary, reason, effectiveDate } = body;

  if (!userId || previousSalary === undefined || newSalary === undefined || !effectiveDate) {
    return NextResponse.json({ error: 'Campos obrigat\u00f3rios: colaborador, sal\u00e1rio anterior, novo sal\u00e1rio e data efetiva.' }, { status: 400 });
  }

  const entry = await prisma.salaryHistory.create({
    data: {
      companyId: user.companyId,
      userId,
      previousSalary,
      newSalary,
      reason: reason || '',
      effectiveDate: new Date(effectiveDate),
      createdById: user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
