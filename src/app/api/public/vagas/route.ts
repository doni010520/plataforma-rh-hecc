import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companySlug = searchParams.get('company');
  const search = searchParams.get('search');
  const location = searchParams.get('location');
  const type = searchParams.get('type');

  const where: Record<string, unknown> = {
    status: 'OPEN',
  };

  if (companySlug) {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ data: [], total: 0 });
    }
    where.companyId = company.id;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (type) {
    where.type = type;
  }

  const positions = await prisma.jobPosition.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      type: true,
      createdAt: true,
      department: { select: { id: true, name: true } },
      company: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: positions, total: positions.length });
}
