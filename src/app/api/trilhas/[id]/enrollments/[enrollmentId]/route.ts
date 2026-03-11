import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; enrollmentId: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, enrollmentId } = await params;

  const enrollment = await prisma.trackEnrollment.findFirst({
    where: { id: enrollmentId, trackId: id },
    include: { track: { select: { companyId: true } } },
  });
  if (!enrollment || enrollment.track.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Inscri\u00e7\u00e3o n\u00e3o encontrada.' }, { status: 404 });
  }

  // Employees can only update their own enrollment
  if (user.role === 'EMPLOYEE' && enrollment.userId !== user.id) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const { status } = body;

  const data: Record<string, unknown> = {};
  if (status) {
    data.status = status;
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (status === 'ACTIVE') data.completedAt = null;
  }

  const updated = await prisma.trackEnrollment.update({
    where: { id: enrollmentId },
    data,
    include: {
      user: { select: { id: true, name: true } },
      progress: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; enrollmentId: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id, enrollmentId } = await params;

  const enrollment = await prisma.trackEnrollment.findFirst({
    where: { id: enrollmentId, trackId: id },
    include: { track: { select: { companyId: true } } },
  });
  if (!enrollment || enrollment.track.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Inscri\u00e7\u00e3o n\u00e3o encontrada.' }, { status: 404 });
  }

  await prisma.trackEnrollment.delete({ where: { id: enrollmentId } });

  return NextResponse.json({ success: true });
}
