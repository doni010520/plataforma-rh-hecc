import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const objective = await prisma.objective.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      parent: { select: { id: true, title: true } },
      children: {
        include: {
          owner: { select: { id: true, name: true } },
          keyResults: true,
        },
      },
      keyResults: {
        include: {
          updates: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!objective) {
    return NextResponse.json({ error: 'Objectivo não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(objective);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const objective = await prisma.objective.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });

  if (!objective) {
    return NextResponse.json({ error: 'Objectivo não encontrado.' }, { status: 404 });
  }

  // Owner, admin, or manager of owner can edit
  const canEdit =
    objective.ownerId === user.id ||
    hasRole(user.role, ['ADMIN']);

  if (!canEdit) {
    // Check if user is the manager of the owner
    const owner = await prisma.user.findUnique({
      where: { id: objective.ownerId },
      select: { managerId: true },
    });
    if (owner?.managerId !== user.id) {
      return forbiddenResponse('Você não tem permissão para editar este objetivo.');
    }
  }

  const body = await request.json();
  const { title, description, status, quarter, year } = body;

  const updated = await prisma.objective.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(quarter !== undefined && { quarter: parseInt(quarter) }),
      ...(year !== undefined && { year: parseInt(year) }),
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      keyResults: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const objective = await prisma.objective.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: { children: { select: { id: true } } },
  });

  if (!objective) {
    return NextResponse.json({ error: 'Objectivo não encontrado.' }, { status: 404 });
  }

  if (objective.ownerId !== user.id && !hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Apenas o dono ou administrador pode excluir este objetivo.');
  }

  if (objective.children.length > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir um objetivo que possui objetivos filhos.' },
      { status: 400 },
    );
  }

  await prisma.objective.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
