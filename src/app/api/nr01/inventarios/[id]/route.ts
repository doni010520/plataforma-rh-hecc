import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { RiskSeverity } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem visualizar inventários de riscos.');
  }

  const { id } = await params;

  const inventory = await prisma.riskInventory.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      identifiedRisks: {
        include: {
          actionPlans: {
            include: {
              responsible: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!inventory) {
    return NextResponse.json(
      { error: 'Inventário de riscos não encontrado.' },
      { status: 404 },
    );
  }

  return NextResponse.json(inventory);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem editar inventários de riscos.');
  }

  const { id } = await params;

  const inventory = await prisma.riskInventory.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!inventory) {
    return NextResponse.json(
      { error: 'Inventário de riscos não encontrado.' },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { title, description, referenceDate, risks } = body;

  // If risks array provided, sync them
  if (risks && Array.isArray(risks)) {
    await prisma.identifiedRisk.deleteMany({ where: { inventoryId: id } });
    await prisma.identifiedRisk.createMany({
      data: risks.map(
        (r: {
          description: string;
          category: string;
          severity: RiskSeverity;
          affectedArea?: string;
          mitigationPlan?: string;
        }) => ({
          inventoryId: id,
          description: r.description,
          category: r.category || '',
          severity: r.severity || 'MEDIUM',
          affectedArea: r.affectedArea || '',
          mitigationPlan: r.mitigationPlan || '',
        }),
      ),
    });
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (referenceDate !== undefined) {
    data.referenceDate = referenceDate ? new Date(referenceDate) : new Date();
  }

  const updated = await prisma.riskInventory.update({
    where: { id },
    data,
    include: {
      identifiedRisks: {
        include: {
          actionPlans: {
            include: {
              responsible: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem excluir inventários de riscos.');
  }

  const { id } = await params;

  const inventory = await prisma.riskInventory.findFirst({
    where: { id, companyId: user.companyId },
  });

  if (!inventory) {
    return NextResponse.json(
      { error: 'Inventário de riscos não encontrado.' },
      { status: 404 },
    );
  }

  await prisma.riskInventory.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
