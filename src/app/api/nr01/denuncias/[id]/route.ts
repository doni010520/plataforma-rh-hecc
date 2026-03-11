import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const complaint = await prisma.complaint.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      updates: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!complaint) {
    return NextResponse.json(
      { error: 'Denúncia não encontrada.' },
      { status: 404 },
    );
  }

  // Only admins or the complaint author can view
  if (user.role === 'EMPLOYEE' && complaint.authorId !== user.id) {
    return forbiddenResponse('Você não tem permissão para visualizar esta denúncia.');
  }

  // Strip author info for anonymous complaints (unless viewer is admin)
  const sanitized = {
    ...complaint,
    author: complaint.anonymous && user.role === 'EMPLOYEE' ? null : complaint.author,
    authorId: complaint.anonymous && user.role === 'EMPLOYEE' ? null : complaint.authorId,
  };

  return NextResponse.json(sanitized);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem atualizar denúncias.');
  }

  const { id } = await params;

  const complaint = await prisma.complaint.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!complaint) {
    return NextResponse.json(
      { error: 'Denúncia não encontrada.' },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { content, newStatus } = body;

  if (!content) {
    return NextResponse.json(
      { error: 'Conteúdo da atualização é obrigatório.' },
      { status: 400 },
    );
  }

  // Create update and change status in a transaction
  const [update, updatedComplaint] = await prisma.$transaction([
    prisma.complaintUpdate.create({
      data: {
        complaintId: id,
        authorId: user.id,
        content,
        newStatus: newStatus || null,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    }),
    ...(newStatus
      ? [
          prisma.complaint.update({
            where: { id },
            data: { status: newStatus },
            include: {
              updates: {
                orderBy: { createdAt: 'asc' },
                include: {
                  author: { select: { id: true, name: true, email: true } },
                },
              },
            },
          }),
        ]
      : [
          prisma.complaint.findFirstOrThrow({
            where: { id },
            include: {
              updates: {
                orderBy: { createdAt: 'asc' },
                include: {
                  author: { select: { id: true, name: true, email: true } },
                },
              },
            },
          }),
        ]),
  ]);

  return NextResponse.json({ update, complaint: updatedComplaint });
}
