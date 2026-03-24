import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const celebration = await prisma.celebration.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!celebration) {
    return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
  }

  // Only the author or an ADMIN can edit
  if (celebration.authorId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão para editar.' }, { status: 403 });
  }

  const { content, type } = await request.json();

  const updated = await prisma.celebration.update({
    where: { id: params.id },
    data: {
      ...(content !== undefined && { content }),
      ...(type !== undefined && { type }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const celebration = await prisma.celebration.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!celebration) {
    return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
  }

  // Only the author or an ADMIN can delete
  if (celebration.authorId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão para excluir.' }, { status: 403 });
  }

  await prisma.celebration.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
