import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  const track = await prisma.learningTrack.findFirst({
    where: { id, companyId: user.companyId },
    include: { contents: { orderBy: { order: 'desc' }, take: 1 } },
  });
  if (!track) {
    return NextResponse.json({ error: 'Trilha n\u00e3o encontrada.' }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, type, contentUrl, durationMinutes, required } = body;

  if (!title || !type) {
    return NextResponse.json({ error: 'T\u00edtulo e tipo s\u00e3o obrigat\u00f3rios.' }, { status: 400 });
  }

  const nextOrder = track.contents.length > 0 ? track.contents[0].order + 1 : 0;

  const content = await prisma.learningContent.create({
    data: {
      trackId: id,
      title,
      description: description || '',
      type,
      contentUrl: contentUrl || null,
      durationMinutes: durationMinutes || 0,
      required: required !== false,
      order: nextOrder,
    },
  });

  return NextResponse.json(content, { status: 201 });
}
