import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const quarter = searchParams.get('quarter');
  const year = searchParams.get('year');
  const status = searchParams.get('status');
  const parentId = searchParams.get('parentId');

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (level) where.level = level;
  if (quarter) where.quarter = parseInt(quarter);
  if (year) where.year = parseInt(year);
  if (status) where.status = status;
  if (parentId) where.parentId = parentId;

  // EMPLOYEE sees only their own objectives
  // MANAGER sees their own + subordinates
  // ADMIN sees all
  if (user.role === 'EMPLOYEE') {
    where.ownerId = user.id;
  } else if (user.role === 'MANAGER') {
    const subordinateIds = await prisma.user.findMany({
      where: { managerId: user.id, companyId: user.companyId, active: true },
      select: { id: true },
    });
    const ids = [user.id, ...subordinateIds.map((s) => s.id)];
    where.OR = [
      { ownerId: { in: ids } },
      { level: 'COMPANY' },
    ];
    delete where.ownerId;
  }

  const objectives = await prisma.objective.findMany({
    where,
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }, { createdAt: 'desc' }],
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      keyResults: {
        orderBy: { updatedAt: 'desc' },
      },
      children: {
        include: {
          owner: { select: { id: true, name: true } },
          keyResults: true,
        },
      },
    },
  });

  return NextResponse.json(objectives);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { title, description, level, quarter, year, parentId, keyResults } = body;

  if (!title || !level || !quarter || !year) {
    return NextResponse.json(
      { error: 'Título, nível, trimestre e ano são obrigatórios.' },
      { status: 400 },
    );
  }

  // Only ADMIN can create COMPANY objectives
  if (level === 'COMPANY' && !hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Apenas administradores podem criar objetivos da empresa.');
  }

  // Only ADMIN/MANAGER can create TEAM objectives
  if (level === 'TEAM' && !hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse('Apenas gestores podem criar objetivos de equipe.');
  }

  // Validate parent exists and belongs to same company
  if (parentId) {
    const parent = await prisma.objective.findFirst({
      where: { id: parentId, companyId: user.companyId },
    });
    if (!parent) {
      return NextResponse.json(
        { error: 'Objectivo pai não encontrado.' },
        { status: 404 },
      );
    }
  }

  const objective = await prisma.objective.create({
    data: {
      companyId: user.companyId,
      ownerId: user.id,
      title,
      description: description || '',
      level,
      quarter: parseInt(quarter),
      year: parseInt(year),
      parentId: parentId || null,
      keyResults: keyResults?.length
        ? {
            create: keyResults.map(
              (kr: { title: string; metricType: string; startValue?: number; targetValue: number }) => ({
                title: kr.title,
                metricType: kr.metricType,
                startValue: kr.startValue || 0,
                targetValue: kr.targetValue,
                currentValue: kr.startValue || 0,
              }),
            ),
          }
        : undefined,
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      keyResults: true,
    },
  });

  return NextResponse.json(objective, { status: 201 });
}
