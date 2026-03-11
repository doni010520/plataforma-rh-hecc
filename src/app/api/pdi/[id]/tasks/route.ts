import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  // Verify plan belongs to company
  const plan = await prisma.developmentPlan.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!plan) {
    return NextResponse.json({ error: 'PDI não encontrado.' }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, type, resourceUrl, dueDate } = body;

  if (!title || !type) {
    return NextResponse.json({ error: 'Título e tipo são obrigatórios.' }, { status: 400 });
  }

  // Get last order
  const lastTask = await prisma.developmentTask.findFirst({
    where: { planId: id },
    orderBy: { order: 'desc' },
  });

  const task = await prisma.developmentTask.create({
    data: {
      planId: id,
      title,
      description: description || '',
      type,
      resourceUrl: resourceUrl || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      order: (lastTask?.order ?? -1) + 1,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
