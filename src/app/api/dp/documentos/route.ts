import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (user.role === 'EMPLOYEE') {
    where.userId = user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (type) where.type = type;
  if (status) where.status = status;

  const documents = await prisma.employeeDocument.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { uploadedAt: 'desc' },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { userId, name, type, fileUrl, expiresAt, notes } = body;

  // Employees can only upload their own docs
  const targetUserId = user.role === 'EMPLOYEE' ? user.id : (userId || user.id);

  if (!name || !type) {
    return NextResponse.json({ error: 'Nome e tipo s\u00e3o obrigat\u00f3rios.' }, { status: 400 });
  }

  const doc = await prisma.employeeDocument.create({
    data: {
      companyId: user.companyId,
      userId: targetUserId,
      name,
      type,
      fileUrl: fileUrl || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes || '',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
