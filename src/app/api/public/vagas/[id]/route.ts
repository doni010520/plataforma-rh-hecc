import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const position = await prisma.jobPosition.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      type: true,
      vacancies: true,
      createdAt: true,
      status: true,
      department: { select: { id: true, name: true } },
      company: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
  });

  if (!position || position.status !== 'OPEN') {
    return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(position);
}
