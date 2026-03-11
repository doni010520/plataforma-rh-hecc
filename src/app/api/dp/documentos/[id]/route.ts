import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const doc = await prisma.employeeDocument.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!doc) {
    return NextResponse.json({ error: 'Documento n\u00e3o encontrado.' }, { status: 404 });
  }

  // Employee can only edit own docs; status changes require ADMIN/MANAGER
  if (user.role === 'EMPLOYEE' && doc.userId !== user.id) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const { name, type, fileUrl, expiresAt, status, notes } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (type !== undefined) data.type = type;
  if (fileUrl !== undefined) data.fileUrl = fileUrl;
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (notes !== undefined) data.notes = notes;
  // Only ADMIN/MANAGER can change status
  if (status !== undefined && user.role !== 'EMPLOYEE') data.status = status;

  const updated = await prisma.employeeDocument.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  const doc = await prisma.employeeDocument.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!doc) {
    return NextResponse.json({ error: 'Documento n\u00e3o encontrado.' }, { status: 404 });
  }

  await prisma.employeeDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
