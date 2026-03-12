import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';
import { BadgeCategory } from '@prisma/client';

const VALID_CATEGORIES: BadgeCategory[] = ['ENGAGEMENT', 'PERFORMANCE', 'LEARNING', 'COLLABORATION', 'MILESTONE'];

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const badges = await prisma.badge.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { userBadges: true } },
    },
  });

  // Get current user's badges
  const userBadges = await prisma.userBadge.findMany({
    where: { userId: user.id },
    select: { badgeId: true, awardedAt: true },
  });

  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));

  const badgesWithEarned = badges.map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.has(badge.id),
  }));

  return NextResponse.json(badgesWithEarned);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN'])) {
    return forbiddenResponse();
  }

  try {
    const body: unknown = await request.json();
    const { name, description, icon, category, pointsRequired } = body as {
      name?: string;
      description?: string;
      icon?: string;
      category?: string;
      pointsRequired?: number;
    };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome é obrigatório.' },
        { status: 400 },
      );
    }

    const badgeCategory = (typeof category === 'string' && VALID_CATEGORIES.includes(category as BadgeCategory))
      ? (category as BadgeCategory)
      : 'ENGAGEMENT';

    const badge = await prisma.badge.create({
      data: {
        companyId: user.companyId,
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        icon: typeof icon === 'string' && icon.trim().length > 0 ? icon.trim() : 'star',
        category: badgeCategory,
        pointsRequired: typeof pointsRequired === 'number' && pointsRequired >= 0 ? Math.round(pointsRequired) : 0,
      },
    });

    return NextResponse.json(badge, { status: 201 });
  } catch (error) {
    console.error('Create badge error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar badge.' },
      { status: 500 },
    );
  }
}
