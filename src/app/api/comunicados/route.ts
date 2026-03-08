import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'received';

  if (view === 'admin' && hasRole(user.role, ['ADMIN'])) {
    // Admin sees all announcements
    const announcements = await prisma.announcement.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { reads: true } },
      },
    });
    return NextResponse.json(announcements);
  }

  // Regular users see sent announcements targeted to their department
  const announcements = await prisma.announcement.findMany({
    where: {
      companyId: user.companyId,
      sentAt: { not: null },
    },
    orderBy: { sentAt: 'desc' },
    include: {
      author: { select: { id: true, name: true } },
      reads: {
        where: { userId: user.id },
        select: { id: true },
      },
    },
  });

  // Filter by department targeting
  const filtered = announcements.filter((a) => {
    const targets: string[] = JSON.parse(a.targetDepartments);
    // Empty targets = all departments
    if (targets.length === 0) return true;
    return user.departmentId ? targets.includes(user.departmentId) : false;
  });

  const result = filtered.map((a) => ({
    ...a,
    isRead: a.reads.length > 0,
    reads: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse('Apenas administradores podem criar comunicados.');
  }

  const body = await request.json();
  const { title, content, targetDepartments, scheduledAt } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: 'Título e conteúdo são obrigatórios.' },
      { status: 400 },
    );
  }

  const announcement = await prisma.announcement.create({
    data: {
      companyId: user.companyId,
      authorId: user.id,
      title,
      content,
      targetDepartments: JSON.stringify(targetDepartments || []),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sentAt: scheduledAt ? null : new Date(),
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}
