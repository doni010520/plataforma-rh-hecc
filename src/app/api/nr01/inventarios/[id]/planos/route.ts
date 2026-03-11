import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem criar planos de ação.');
  }

  const { id } = await params;

  // Verify the inventory belongs to user's company
  const inventory = await prisma.riskInventory.findFirst({
    where: { id, companyId: user.companyId },
    include: { identifiedRisks: true },
  });

  if (!inventory) {
    return NextResponse.json(
      { error: 'Inventário de riscos não encontrado.' },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { riskId, title, description, responsibleId, dueDate } = body;

  if (!riskId || !title || !responsibleId) {
    return NextResponse.json(
      { error: 'Risco, título e responsável são obrigatórios.' },
      { status: 400 },
    );
  }

  // Verify the risk belongs to this inventory
  const risk = inventory.identifiedRisks.find((r) => r.id === riskId);
  if (!risk) {
    return NextResponse.json(
      { error: 'Risco não encontrado neste inventário.' },
      { status: 404 },
    );
  }

  // Verify responsible user exists in the same company
  const responsible = await prisma.user.findFirst({
    where: { id: responsibleId, companyId: user.companyId },
  });
  if (!responsible) {
    return NextResponse.json(
      { error: 'Responsável não encontrado.' },
      { status: 404 },
    );
  }

  const plan = await prisma.actionPlan.create({
    data: {
      riskId,
      title,
      description: description || '',
      responsibleId,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      responsible: { select: { id: true, name: true, email: true } },
      risk: true,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (user.role === 'EMPLOYEE') {
    return forbiddenResponse('Apenas administradores podem atualizar planos de ação.');
  }

  const { id } = await params;

  // Verify inventory belongs to user's company
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
  const { planId, title, description, responsibleId, dueDate, status } = body;

  if (!planId) {
    return NextResponse.json(
      { error: 'ID do plano de ação é obrigatório.' },
      { status: 400 },
    );
  }

  // Verify the plan belongs to a risk in this inventory
  const plan = await prisma.actionPlan.findFirst({
    where: {
      id: planId,
      risk: { inventoryId: id },
    },
  });

  if (!plan) {
    return NextResponse.json(
      { error: 'Plano de ação não encontrado neste inventário.' },
      { status: 404 },
    );
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (responsibleId !== undefined) data.responsibleId = responsibleId;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (status !== undefined) {
    data.status = status;
    if (status === 'COMPLETED') {
      data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }
  }

  const updated = await prisma.actionPlan.update({
    where: { id: planId },
    data,
    include: {
      responsible: { select: { id: true, name: true, email: true } },
      risk: true,
    },
  });

  return NextResponse.json(updated);
}
