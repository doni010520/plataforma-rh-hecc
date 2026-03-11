import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { RiskSeverity } from '@prisma/client';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem visualizar inventários de riscos.');
  }

  const inventories = await prisma.riskInventory.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      identifiedRisks: {
        include: {
          _count: { select: { actionPlans: true } },
        },
      },
      _count: { select: { identifiedRisks: true } },
    },
  });

  return NextResponse.json(inventories);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem criar inventários de riscos.');
  }

  const body = await request.json();
  const { title, description, referenceDate, risks } = body;

  if (!title) {
    return NextResponse.json(
      { error: 'Título é obrigatório.' },
      { status: 400 },
    );
  }

  const inventory = await prisma.riskInventory.create({
    data: {
      companyId: user.companyId,
      title,
      description: description || '',
      referenceDate: referenceDate ? new Date(referenceDate) : new Date(),
      createdById: user.id,
      identifiedRisks: risks?.length
        ? {
            create: risks.map(
              (r: {
                description: string;
                category: string;
                severity: RiskSeverity;
                affectedArea?: string;
                mitigationPlan?: string;
              }) => ({
                description: r.description,
                category: r.category || '',
                severity: r.severity || 'MEDIUM',
                affectedArea: r.affectedArea || '',
                mitigationPlan: r.mitigationPlan || '',
              }),
            ),
          }
        : undefined,
    },
    include: {
      identifiedRisks: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(inventory, { status: 201 });
}
