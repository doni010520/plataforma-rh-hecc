import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { colaboradorInviteTemplate } from '@/lib/email-templates';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const departmentId = searchParams.get('departmentId') || undefined;
  const search = searchParams.get('search') || undefined;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    companyId: user.companyId,
  };

  if (user.role === 'MANAGER') {
    where.managerId = user.id;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { jobTitle: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [colaboradores, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: colaboradores,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  try {
    const { name, email, jobTitle, departmentId, managerId, role } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios.' },
        { status: 400 },
      );
    }

    const emailLower = email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { companyId: user.companyId, email: emailLower },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um colaborador com este email nesta empresa.' },
        { status: 400 },
      );
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, companyId: user.companyId },
      });
      if (!dept) {
        return NextResponse.json(
          { error: 'Departamento não encontrado.' },
          { status: 400 },
        );
      }
    }

    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, companyId: user.companyId, active: true },
      });
      if (!manager) {
        return NextResponse.json(
          { error: 'Gestor não encontrado.' },
          { status: 400 },
        );
      }
    }

    const supabase = createClient();
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(emailLower);

    if (inviteError || !inviteData.user) {
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
      });

      if (signUpError || !signUpData.user) {
        return NextResponse.json(
          { error: 'Erro ao enviar convite. Verifique o email e tente novamente.' },
          { status: 500 },
        );
      }

      const colaborador = await prisma.user.create({
        data: {
          authId: signUpData.user.id,
          companyId: user.companyId,
          email: emailLower,
          name: name.trim(),
          role: role || 'EMPLOYEE',
          jobTitle: jobTitle?.trim() || null,
          departmentId: departmentId || null,
          managerId: managerId || null,
        },
        include: {
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const { subject, html } = colaboradorInviteTemplate({
        employeeName: name.trim(),
        companyName: user.company.name,
        inviterName: user.name,
        loginUrl: `${appUrl}/login`,
      });
      sendEmail({ to: emailLower, subject, html }).catch(() => {});

      return NextResponse.json(colaborador, { status: 201 });
    }

    const colaborador = await prisma.user.create({
      data: {
        authId: inviteData.user.id,
        companyId: user.companyId,
        email: emailLower,
        name: name.trim(),
        role: role || 'EMPLOYEE',
        jobTitle: jobTitle?.trim() || null,
        departmentId: departmentId || null,
        managerId: managerId || null,
      },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { subject, html } = colaboradorInviteTemplate({
      employeeName: name.trim(),
      companyName: user.company.name,
      inviterName: user.name,
      loginUrl: `${appUrl}/login`,
    });
    sendEmail({ to: emailLower, subject, html }).catch(() => {});

    return NextResponse.json(colaborador, { status: 201 });
  } catch (error) {
    console.error('Create colaborador error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar colaborador.' },
      { status: 500 },
    );
  }
}
