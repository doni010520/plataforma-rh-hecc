import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, meetingId } = await params;

  const cycle = await prisma.oneOnOneCycle.findFirst({
    where: {
      id,
      companyId: user.companyId,
      OR: [{ managerId: user.id }, { employeeId: user.id }],
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  const topics = await prisma.oneOnOneTopic.findMany({
    where: { meetingId },
    orderBy: { order: 'asc' },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(topics);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id, meetingId } = await params;

  const cycle = await prisma.oneOnOneCycle.findFirst({
    where: {
      id,
      companyId: user.companyId,
      OR: [{ managerId: user.id }, { employeeId: user.id }],
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  const meeting = await prisma.oneOnOneMeeting.findFirst({
    where: { id: meetingId, cycleId: id },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 });
  }

  try {
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Conteúdo do tópico é obrigatório.' },
        { status: 400 },
      );
    }

    const maxOrder = await prisma.oneOnOneTopic.findFirst({
      where: { meetingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const topic = await prisma.oneOnOneTopic.create({
      data: {
        meetingId,
        authorId: user.id,
        content: content.trim(),
        order: (maxOrder?.order ?? -1) + 1,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error('Create topic error:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar tópico.' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  const cycle = await prisma.oneOnOneCycle.findFirst({
    where: {
      id,
      companyId: user.companyId,
      OR: [{ managerId: user.id }, { employeeId: user.id }],
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo 1:1 não encontrado.' }, { status: 404 });
  }

  try {
    const { topicId } = await request.json();

    if (!topicId) {
      return NextResponse.json(
        { error: 'topicId é obrigatório.' },
        { status: 400 },
      );
    }

    const topic = await prisma.oneOnOneTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      return NextResponse.json({ error: 'Tópico não encontrado.' }, { status: 404 });
    }

    const updated = await prisma.oneOnOneTopic.update({
      where: { id: topicId },
      data: { discussed: !topic.discussed },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Toggle topic error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar tópico.' },
      { status: 500 },
    );
  }
}
