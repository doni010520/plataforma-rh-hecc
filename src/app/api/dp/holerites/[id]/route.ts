import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  const payslip = await prisma.payslip.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!payslip) {
    return NextResponse.json({ error: 'Holerite n\u00e3o encontrado.' }, { status: 404 });
  }

  await prisma.payslip.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
