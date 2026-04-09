import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, taskId } = await params;

  // Verify plan belongs to company AND user has access
  const plan = await prisma.developmentPlan.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!plan) {
    return NextResponse.json({ error: 'PDI não encontrado.' }, { status: 404 });
  }
  // Only plan owner, their manager, or admin can modify tasks
  if (plan.userId !== user.id && user.role === 'EMPLOYEE') {
    return forbiddenResponse('Sem permissão para editar este PDI.');
  }

  const body = await request.json();
  const { title, description, type, resourceUrl, dueDate, status } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (type !== undefined) data.type = type;
  if (resourceUrl !== undefined) data.resourceUrl = resourceUrl;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (status !== undefined) {
    data.status = status;
    data.completedAt = status === 'COMPLETED' ? new Date() : null;
  }

  const task = await prisma.developmentTask.update({
    where: { id: taskId },
    data,
  });

  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, taskId } = await params;

  // Verify plan belongs to company
  const plan = await prisma.developmentPlan.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!plan) {
    return NextResponse.json({ error: 'PDI não encontrado.' }, { status: 404 });
  }

  await prisma.developmentTask.delete({
    where: { id: taskId },
  });

  return NextResponse.json({ success: true });
}
