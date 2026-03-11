import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const departmentId = searchParams.get('departmentId');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [positions, total] = await Promise.all([
    prisma.jobPosition.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.jobPosition.count({ where }),
  ]);

  return NextResponse.json({ data: positions, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

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
    stages,
  } = body;

  if (!title) {
    return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 });
  }

  const position = await prisma.jobPosition.create({
    data: {
      companyId: user.companyId,
      createdById: user.id,
      title,
      description: description || '',
      departmentId: departmentId || null,
      location: location || null,
      type: type || null,
      salaryMin: salaryMin != null ? salaryMin : null,
      salaryMax: salaryMax != null ? salaryMax : null,
      vacancies: vacancies || 1,
      stages: stages?.length
        ? {
            create: stages
              .filter((s: { name: string }) => s.name?.trim())
              .map((stage: { name: string }, index: number) => ({
                name: stage.name,
                order: index,
              })),
          }
        : undefined,
    },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      stages: { orderBy: { order: 'asc' } },
    },
  });

  return NextResponse.json(position, { status: 201 });
}
