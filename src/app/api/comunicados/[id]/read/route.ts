import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const announcement = await prisma.announcement.findFirst({
    where: { id: params.id, companyId: user.companyId, sentAt: { not: null } },
  });

  if (!announcement) {
    return NextResponse.json({ error: 'Comunicado não encontrado.' }, { status: 404 });
  }

  // Upsert read status
  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId: params.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      announcementId: params.id,
      userId: user.id,
    },
  });

  return NextResponse.json({ success: true });
}
