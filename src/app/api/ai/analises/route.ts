import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const targetId = searchParams.get('targetId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { companyId: user.companyId };
  if (type) where.type = type;
  if (targetId) where.targetId = targetId;

  const [analyses, total] = await Promise.all([
    prisma.aiAnalysis.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.aiAnalysis.count({ where }),
  ]);

  return NextResponse.json({ data: analyses, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { type, title, summary, details, targetId, targetType, confidence } = body;

  if (!type || !title) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: type, title.' },
      { status: 400 }
    );
  }

  const analysis = await prisma.aiAnalysis.create({
    data: {
      companyId: user.companyId,
      type,
      title,
      summary: summary || '',
      details: details || '',
      targetId: targetId || null,
      targetType: targetType || null,
      confidence: confidence ?? 0,
    },
  });

  return NextResponse.json(analysis, { status: 201 });
}
