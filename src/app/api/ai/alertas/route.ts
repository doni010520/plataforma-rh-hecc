import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const readFilter = searchParams.get('read');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    companyId: user.companyId,
    dismissedAt: null,
  };

  // Employees see only their own alerts
  if (user.role === 'EMPLOYEE') {
    where.userId = user.id;
  } else {
    // Admins/managers can filter by userId
    const userId = searchParams.get('userId');
    if (userId) where.userId = userId;
  }

  if (readFilter === 'true') where.read = true;
  if (readFilter === 'false') where.read = false;
  if (priority) where.priority = priority;
  if (category) where.category = category;

  const [alerts, total] = await Promise.all([
    prisma.aiAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.aiAlert.count({ where }),
  ]);

  return NextResponse.json({ data: alerts, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { userId, title, message, priority, category, actionUrl } = body;

  if (!title || !message) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: title, message.' },
      { status: 400 }
    );
  }

  const alert = await prisma.aiAlert.create({
    data: {
      companyId: user.companyId,
      userId: userId || null,
      title,
      message,
      priority: priority || 'MEDIUM',
      category: category || '',
      actionUrl: actionUrl || null,
    },
  });

  return NextResponse.json(alert, { status: 201 });
}
