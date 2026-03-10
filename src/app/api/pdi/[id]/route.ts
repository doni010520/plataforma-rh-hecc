import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const plan = await prisma.developmentPlan.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          jobTitle: true,
          department: { select: { name: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      reviewCycle: { select: { id: true, name: true } },
      tasks: { orderBy: { order: 'asc' } },
      comments: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: 'PDI não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();
  const { title, description, status, dueDate } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  await prisma.developmentPlan.updateMany({
    where: { id, companyId: user.companyId },
    data,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  await prisma.developmentPlan.deleteMany({
    where: { id, companyId: user.companyId },
  });

  return NextResponse.json({ success: true });
}
