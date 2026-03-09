import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || '',
      link: params.link || null,
    },
  });
}

export async function createNotificationsForMany(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>,
) {
  if (userIds.length === 0) return;
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      companyId: params.companyId,
      userId,
      type: params.type,
      title: params.title,
      body: params.body || '',
      link: params.link || null,
    })),
  });
}
