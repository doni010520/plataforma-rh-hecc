import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const track = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!track) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada.' }, { status: 404 });
  }

  const where: Record<string, unknown> = { trackId: id };

  // Employees only see their own enrollment
  if (user.role === 'EMPLOYEE') {
    where.userId = user.id;
  }

  const enrollments = await prisma.trackEnrollment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
      progress: true,
    },
    orderBy: { enrolledAt: 'desc' },
  });

  return NextResponse.json(enrollments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const track = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId, status: 'PUBLISHED' },
    include: { contents: { orderBy: { order: 'asc' } } },
  });
  if (!track) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada ou n\u00e3o publicada.' }, { status: 404 });
  }

  const body = await request.json();
  // ADMIN/MANAGER can enroll others, EMPLOYEE can only self-enroll
  const targetUserId = (user.role !== 'EMPLOYEE' && body.userId) ? body.userId : user.id;

  // Check if already enrolled
  const existing = await prisma.trackEnrollment.findUnique({
    where: { trackId_userId: { trackId: id, userId: targetUserId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Usu\u00e1rio j\u00e1 est\u00e1 inscrito nesta trilha.' }, { status: 409 });
  }

  const enrollment = await prisma.trackEnrollment.create({
    data: {
      trackId: id,
      userId: targetUserId,
      progress: {
        create: track.contents.map((c) => ({
          contentId: c.id,
        })),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      progress: true,
    },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
