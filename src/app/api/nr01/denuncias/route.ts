import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');

  const where: Record<string, unknown> = { companyId: user.companyId };

  // EMPLOYEE can only see their own complaints
  if (user.role === 'EMPLOYEE') {
    where.authorId = user.id;
  }
  if (status) where.status = status;
  if (category) where.category = category;

  const complaints = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, email: true } },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { updates: true } },
    },
  });

  // Strip author info for anonymous complaints
  const sanitized = complaints.map((c) => ({
    ...c,
    author: c.anonymous ? null : c.author,
    authorId: c.anonymous ? null : c.authorId,
  }));

  return NextResponse.json(sanitized);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { category, description, anonymous } = body;

  if (!category || !description) {
    return NextResponse.json(
      { error: 'Categoria e descrição são obrigatórios.' },
      { status: 400 },
    );
  }

  const complaint = await prisma.complaint.create({
    data: {
      companyId: user.companyId,
      authorId: anonymous ? null : user.id,
      anonymous: anonymous || false,
      category,
      description,
    },
  });

  return NextResponse.json(complaint, { status: 201 });
}
