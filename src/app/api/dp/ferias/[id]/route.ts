import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const vacation = await prisma.vacationRequest.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!vacation) {
    return NextResponse.json({ error: 'Solicita\u00e7\u00e3o n\u00e3o encontrada.' }, { status: 404 });
  }

  const body = await request.json();
  const { status, notes } = body;

  const data: Record<string, unknown> = {};
  if (status) {
    // Only ADMIN/MANAGER can approve/reject
    if (['APPROVED', 'REJECTED'].includes(status) && user.role === 'EMPLOYEE') {
      return forbiddenResponse();
    }
    data.status = status;
    if (status === 'APPROVED') {
      data.approvedById = user.id;
      data.approvedAt = new Date();
    }
  }
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.vacationRequest.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true, jobTitle: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const vacation = await prisma.vacationRequest.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!vacation) {
    return NextResponse.json({ error: 'Solicita\u00e7\u00e3o n\u00e3o encontrada.' }, { status: 404 });
  }

  // Employee can only cancel own pending requests
  if (user.role === 'EMPLOYEE' && (vacation.userId !== user.id || vacation.status !== 'PENDING')) {
    return forbiddenResponse();
  }

  await prisma.vacationRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
