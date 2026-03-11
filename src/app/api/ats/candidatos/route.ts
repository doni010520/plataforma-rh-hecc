import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.candidate.count({ where }),
  ]);

  return NextResponse.json({ data: candidates, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { name, email, phone, resumeUrl, linkedIn, notes } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Nome e email são obrigatórios.' },
      { status: 400 },
    );
  }

  const existing = await prisma.candidate.findUnique({
    where: { companyId_email: { companyId: user.companyId, email } },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Candidato com este email já existe.' },
      { status: 409 },
    );
  }

  const candidate = await prisma.candidate.create({
    data: {
      companyId: user.companyId,
      name,
      email,
      phone: phone || null,
      resumeUrl: resumeUrl || null,
      linkedIn: linkedIn || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
