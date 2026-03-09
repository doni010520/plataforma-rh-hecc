import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: Request) {
  try {
    const { companyName, name, email, password } = await request.json();

    if (!companyName || !name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios.' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres.' },
        { status: 400 },
      );
    }

    const baseSlug = generateSlug(companyName);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('Supabase signUp error:', authError?.message, authError?.status, JSON.stringify(authData));
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado.' },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: 'Erro ao criar conta. Tente novamente.' },
        { status: 500 },
      );
    }

    const company = await prisma.company.create({
      data: {
        name: companyName,
        slug,
      },
    });

    await prisma.user.create({
      data: {
        authId: authData.user.id,
        companyId: company.id,
        email,
        name,
        role: 'ADMIN',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor. Tente novamente.' },
      { status: 500 },
    );
  }
}
