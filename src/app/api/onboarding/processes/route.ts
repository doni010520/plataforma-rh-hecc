import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const where: Record<string, unknown> = { companyId: user.companyId };

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

  const processes = await prisma.onboardingProcess.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      template: { select: { id: true, name: true, durationDays: true } },
      tasks: { orderBy: { dueDate: 'asc' } },
      evaluations: { include: { evaluator: { select: { id: true, name: true } } } },
    },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json(processes);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { userId, templateId, startDate } = body;

  if (!userId || !templateId || !startDate) {
    return NextResponse.json(
      { error: 'Colaborador, template e data de início são obrigatórios.' },
      { status: 400 }
    );
  }

  const template = await prisma.onboardingTemplate.findFirst({
    where: { id: templateId, companyId: user.companyId },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 });
  }

  const start = new Date(startDate);

  const process = await prisma.onboardingProcess.create({
    data: {
      companyId: user.companyId,
      userId,
      templateId,
      startDate: start,
      tasks: {
        create: template.tasks.map((task) => ({
          title: task.title,
          description: task.description,
          type: task.type,
          dueDate: new Date(start.getTime() + task.dueDay * 86400000),
          assignedTo: task.assignedTo,
        })),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      tasks: true,
    },
  });

  return NextResponse.json(process, { status: 201 });
}
