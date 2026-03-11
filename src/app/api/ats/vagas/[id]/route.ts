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

  const position = await prisma.jobPosition.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      stages: { orderBy: { order: 'asc' } },
      applications: {
        include: {
          candidate: true,
          evaluations: {
            include: {
              evaluator: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          interviews: {
            include: {
              interviewer: { select: { id: true, name: true } },
            },
            orderBy: { scheduledAt: 'asc' },
          },
        },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  if (!position) {
    return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(position);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const {
    title,
    description,
    departmentId,
    location,
    type,
    salaryMin,
    salaryMax,
    vacancies,
    status,
  } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  if (location !== undefined) data.location = location || null;
  if (type !== undefined) data.type = type || null;
  if (salaryMin !== undefined) data.salaryMin = salaryMin;
  if (salaryMax !== undefined) data.salaryMax = salaryMax;
  if (vacancies !== undefined) data.vacancies = vacancies;
  if (status !== undefined) {
    data.status = status;
    if (status === 'CLOSED' || status === 'CANCELLED') {
      data.closedAt = new Date();
    }
  }

  const result = await prisma.jobPosition.updateMany({
    where: { id, companyId: user.companyId },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  await prisma.jobPosition.deleteMany({
    where: { id, companyId: user.companyId },
  });

  return NextResponse.json({ success: true });
}
