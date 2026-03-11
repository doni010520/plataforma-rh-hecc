import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; contentId: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id, contentId } = await params;

  const track = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!track) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada.' }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, type, contentUrl, durationMinutes, required, order } = body;

  const content = await prisma.learningContent.update({
    where: { id: contentId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(contentUrl !== undefined && { contentUrl }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(required !== undefined && { required }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json(content);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; contentId: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id, contentId } = await params;

  const track = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!track) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada.' }, { status: 404 });
  }

  await prisma.learningContent.delete({ where: { id: contentId } });

  return NextResponse.json({ success: true });
}
