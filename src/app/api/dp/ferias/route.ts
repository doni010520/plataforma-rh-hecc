import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (user.role === 'EMPLOYEE') {
    where.userId = user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (status) where.status = status;

  const vacations = await prisma.vacationRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, jobTitle: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(vacations);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { userId, startDate, endDate, daysRequested, type, notes } = body;

  // Employees can only request for themselves
  const targetUserId = user.role === 'EMPLOYEE' ? user.id : (userId || user.id);

  if (!startDate || !endDate || !daysRequested) {
    return NextResponse.json({ error: 'Data de in\u00edcio, fim e dias solicitados s\u00e3o obrigat\u00f3rios.' }, { status: 400 });
  }

  const vacation = await prisma.vacationRequest.create({
    data: {
      companyId: user.companyId,
      userId: targetUserId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      daysRequested,
      type: type || 'REGULAR',
      notes: notes || '',
    },
    include: {
      user: { select: { id: true, name: true, email: true, jobTitle: true } },
    },
  });

  return NextResponse.json(vacation, { status: 201 });
}
