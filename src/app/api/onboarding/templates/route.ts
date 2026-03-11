import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const templates = await prisma.onboardingTemplate.findMany({
    where: { companyId: user.companyId },
    include: {
      department: { select: { id: true, name: true } },
      tasks: { orderBy: { order: 'asc' } },
      _count: { select: { processes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { name, description, departmentId, jobTitle, durationDays, tasks } = body;

  if (!name) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
  }

  const template = await prisma.onboardingTemplate.create({
    data: {
      companyId: user.companyId,
      name,
      description: description || '',
      departmentId: departmentId || null,
      jobTitle: jobTitle || null,
      durationDays: durationDays || 90,
      tasks: tasks?.length
        ? {
            create: tasks.map((task: any, index: number) => ({
              title: task.title,
              description: task.description || '',
              type: task.type,
              dueDay: task.dueDay,
              assignedTo: task.assignedTo,
              order: index,
            })),
          }
        : undefined,
    },
    include: { tasks: true },
  });

  return NextResponse.json(template, { status: 201 });
}
