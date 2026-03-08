import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  // Get all sent announcements for this company
  const announcements = await prisma.announcement.findMany({
    where: {
      companyId: user.companyId,
      sentAt: { not: null },
    },
    select: {
      id: true,
      targetDepartments: true,
      reads: {
        where: { userId: user.id },
        select: { id: true },
      },
    },
  });

  // Filter by department and count unread
  const unreadCount = announcements.filter((a) => {
    const targets: string[] = JSON.parse(a.targetDepartments);
    const isTargeted = targets.length === 0 || (user.departmentId ? targets.includes(user.departmentId) : false);
    return isTargeted && a.reads.length === 0;
  }).length;

  return NextResponse.json({ count: unreadCount });
}
