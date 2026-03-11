import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const track = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      createdBy: { select: { id: true, name: true } },
      contents: { orderBy: { order: 'asc' }, include: { _count: { select: { progress: true } } } },
      enrollments: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
          progress: true,
        },
        orderBy: { enrolledAt: 'desc' },
      },
    },
  });

  if (!track) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada.' }, { status: 404 });
  }

  return NextResponse.json(track);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  const existing = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada.' }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, category, estimatedHours, status } = body;

  const track = await prisma.learningTrack.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(estimatedHours !== undefined && { estimatedHours }),
      ...(status !== undefined && { status }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      contents: { orderBy: { order: 'asc' } },
      _count: { select: { contents: true, enrollments: true } },
    },
  });

  return NextResponse.json(track);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  const existing = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada.' }, { status: 404 });
  }

  await prisma.learningTrack.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
