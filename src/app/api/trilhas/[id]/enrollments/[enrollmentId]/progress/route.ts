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

  // Employees can only update their own progress
  if (user.role === 'EMPLOYEE' && enrollment.userId !== user.id) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const { contentId, status, notes } = body;

  if (!contentId || !status) {
    return NextResponse.json({ error: 'contentId e status s\u00e3o obrigat\u00f3rios.' }, { status: 400 });
  }

  const data: Record<string, unknown> = { status };
  if (status === 'COMPLETED') data.completedAt = new Date();
  if (status !== 'COMPLETED') data.completedAt = null;
  if (notes !== undefined) data.notes = notes;

  const progress = await prisma.contentProgress.upsert({
    where: { enrollmentId_contentId: { enrollmentId, contentId } },
    update: data,
    create: {
      enrollmentId,
      contentId,
      ...data,
    },
  });

  // Check if all required contents are completed to auto-complete enrollment
  const allProgress = await prisma.contentProgress.findMany({
    where: { enrollmentId },
    include: { content: { select: { required: true } } },
  });

  const requiredProgress = allProgress.filter((p) => p.content.required);
  const allRequiredDone = requiredProgress.length > 0 && requiredProgress.every((p) => p.status === 'COMPLETED');

  if (allRequiredDone && enrollment.status === 'ACTIVE') {
    await prisma.trackEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  return NextResponse.json(progress);
}
