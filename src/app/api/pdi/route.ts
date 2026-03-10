import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { companyId: user.companyId };

  // Role-based filtering
  if (user.role === 'EMPLOYEE') {
    where.userId = user.id;
  } else if (user.role === 'MANAGER') {
    const subordinateIds = await prisma.user.findMany({
      where: { managerId: user.id, companyId: user.companyId, active: true },
      select: { id: true },
    });
    const ids = [user.id, ...subordinateIds.map((s) => s.id)];
    where.userId = { in: ids };
  }

  if (userId) where.userId = userId;
  if (status) where.status = status;

  const plans = await prisma.developmentPlan.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      createdBy: { select: { id: true, name: true } },
      tasks: { orderBy: { order: 'asc' } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { title, description, userId, dueDate, reviewCycleId, tasks } = body;

  if (!title) {
    return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 });
  }

  const plan = await prisma.developmentPlan.create({
    data: {
      companyId: user.companyId,
      userId: userId || user.id,
      createdById: user.id,
      title,
      description: description || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      reviewCycleId: reviewCycleId || null,
      tasks: tasks?.length
        ? {
            create: tasks
              .filter((t: { title: string }) => t.title.trim())
              .map((task: { title: string; description?: string; type: string; resourceUrl?: string; dueDate?: string }, index: number) => ({
                title: task.title,
                description: task.description || '',
                type: task.type,
                resourceUrl: task.resourceUrl || null,
                dueDate: task.dueDate ? new Date(task.dueDate) : null,
                order: index,
              })),
          }
        : undefined,
    },
    include: {
      user: { select: { id: true, name: true } },
      tasks: true,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
