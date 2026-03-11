import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { companyId: user.companyId };
  if (status) where.status = status;

  // Employees only see PUBLISHED tracks
  if (user.role === 'EMPLOYEE') {
    where.status = 'PUBLISHED';
  }

  const tracks = await prisma.learningTrack.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { contents: true, enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(tracks);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { title, description, category, estimatedHours, contents } = body;

  if (!title) {
    return NextResponse.json({ error: 'T\u00edtulo \u00e9 obrigat\u00f3rio.' }, { status: 400 });
  }

  const track = await prisma.learningTrack.create({
    data: {
      companyId: user.companyId,
      createdById: user.id,
      title,
      description: description || '',
      category: category || '',
      estimatedHours: estimatedHours || 0,
      contents: contents?.length
        ? {
            create: contents
              .filter((c: { title: string }) => c.title.trim())
              .map((c: { title: string; description?: string; type: string; contentUrl?: string; durationMinutes?: number; required?: boolean }, index: number) => ({
                title: c.title,
                description: c.description || '',
                type: c.type,
                contentUrl: c.contentUrl || null,
                durationMinutes: c.durationMinutes || 0,
                required: c.required !== false,
                order: index,
              })),
          }
        : undefined,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      contents: { orderBy: { order: 'asc' } },
      _count: { select: { contents: true, enrollments: true } },
    },
  });

  return NextResponse.json(track, { status: 201 });
}
