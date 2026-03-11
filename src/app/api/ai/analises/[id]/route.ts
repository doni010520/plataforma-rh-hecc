import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const analysis = await prisma.aiAnalysis.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'Análise não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(analysis);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const { id } = await params;

  const analysis = await prisma.aiAnalysis.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'Análise não encontrada.' }, { status: 404 });
  }

  await prisma.aiAnalysis.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
