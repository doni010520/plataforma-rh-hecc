import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const alert = await prisma.aiAlert.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!alert) {
    return NextResponse.json({ error: 'Alerta não encontrado.' }, { status: 404 });
  }

  // Employees can only update their own alerts
  if (user.role === 'EMPLOYEE' && alert.userId !== user.id) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.read !== undefined) data.read = body.read;
  if (body.dismiss === true) data.dismissedAt = new Date();

  const updated = await prisma.aiAlert.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  const alert = await prisma.aiAlert.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!alert) {
    return NextResponse.json({ error: 'Alerta não encontrado.' }, { status: 404 });
  }

  await prisma.aiAlert.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
