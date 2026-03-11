import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const year = searchParams.get('year');

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (user.role === 'EMPLOYEE') {
    where.userId = user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (year) where.referenceYear = parseInt(year);

  const payslips = await prisma.payslip.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
  });

  return NextResponse.json(payslips);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { userId, referenceMonth, referenceYear, grossSalary, netSalary, deductions, bonuses, fileUrl } = body;

  if (!userId || !referenceMonth || !referenceYear || grossSalary === undefined || netSalary === undefined) {
    return NextResponse.json({ error: 'Campos obrigat\u00f3rios: colaborador, m\u00eas, ano, sal\u00e1rio bruto e l\u00edquido.' }, { status: 400 });
  }

  const payslip = await prisma.payslip.create({
    data: {
      companyId: user.companyId,
      userId,
      referenceMonth,
      referenceYear,
      grossSalary,
      netSalary,
      deductions: deductions || 0,
      bonuses: bonuses || 0,
      fileUrl: fileUrl || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(payslip, { status: 201 });
}
