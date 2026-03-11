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

  const history = await prisma.jobHistory.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      previousDepartment: { select: { id: true, name: true } },
      newDepartment: { select: { id: true, name: true } },
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
  const { userId, previousJobTitle, newJobTitle, previousDepartmentId, newDepartmentId, reason, effectiveDate } = body;

  if (!userId || !newJobTitle || !effectiveDate) {
    return NextResponse.json({ error: 'Campos obrigat\u00f3rios: colaborador, novo cargo e data efetiva.' }, { status: 400 });
  }

  const entry = await prisma.jobHistory.create({
    data: {
      companyId: user.companyId,
      userId,
      previousJobTitle: previousJobTitle || null,
      newJobTitle,
      previousDepartmentId: previousDepartmentId || null,
      newDepartmentId: newDepartmentId || null,
      reason: reason || '',
      effectiveDate: new Date(effectiveDate),
      createdById: user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      previousDepartment: { select: { id: true, name: true } },
      newDepartment: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
