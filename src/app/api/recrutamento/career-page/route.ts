import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Career page settings are stored as a simple check:
// If there are OPEN positions, career page is considered enabled.
// This endpoint provides a way to check and manage career page state.

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const openPositionsCount = await prisma.jobPosition.count({
    where: { companyId: user.companyId, status: 'OPEN' },
  });

  return NextResponse.json({
    enabled: openPositionsCount > 0,
    openPositions: openPositionsCount,
    careerPageUrl: `/vagas?company=${user.company?.slug || ''}`,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json() as { enabled: boolean };

  if (!body.enabled) {
    // Put all OPEN positions on hold
    await prisma.jobPosition.updateMany({
      where: { companyId: user.companyId, status: 'OPEN' },
      data: { status: 'ON_HOLD' },
    });

    return NextResponse.json({ enabled: false, message: 'Página de carreiras desativada.' });
  }

  // Re-open ON_HOLD positions
  await prisma.jobPosition.updateMany({
    where: { companyId: user.companyId, status: 'ON_HOLD' },
    data: { status: 'OPEN' },
  });

  const openPositionsCount = await prisma.jobPosition.count({
    where: { companyId: user.companyId, status: 'OPEN' },
  });

  return NextResponse.json({
    enabled: openPositionsCount > 0,
    openPositions: openPositionsCount,
    careerPageUrl: `/vagas?company=${user.company?.slug || ''}`,
  });
}
