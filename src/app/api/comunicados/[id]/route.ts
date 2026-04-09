import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const announcement = await prisma.announcement.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!announcement) {
    return NextResponse.json({ error: 'Comunicado não encontrado.' }, { status: 404 });
  }

  // Author or ADMIN can edit
  if (announcement.authorId !== user.id && !hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Sem permissão para editar este comunicado.');
  }

  const body = await request.json();
  const { title, content, targetDepartments, scheduledAt, send } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (targetDepartments !== undefined) data.targetDepartments = JSON.stringify(targetDepartments);
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

  // Send immediately
  if (send) {
    data.sentAt = new Date();
  }

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data,
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const announcement = await prisma.announcement.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!announcement) {
    return NextResponse.json({ error: 'Comunicado não encontrado.' }, { status: 404 });
  }

  // Author or ADMIN can delete
  if (announcement.authorId !== user.id && !hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Sem permissão para excluir este comunicado.');
  }

  await prisma.announcement.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
