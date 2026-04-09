import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const jobTitle = formData.get('jobTitle') as string | null;
    const avatarFile = formData.get('avatar') as File | null;

    if (name && name.trim().length < 2) {
      return NextResponse.json(
        { error: 'O nome deve ter no mínimo 2 caracteres.' },
        { status: 400 },
      );
    }

    let avatarUrl: string | undefined;

    if (avatarFile && avatarFile.size > 0) {
      if (avatarFile.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'A imagem deve ter no máximo 2MB.' },
          { status: 400 },
        );
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(avatarFile.type)) {
        return NextResponse.json(
          { error: 'Formato de imagem não suportado. Use JPEG, PNG ou WebP.' },
          { status: 400 },
        );
      }

      const supabase = createClient();

      // Ensure bucket exists (idempotent)
      await supabase.storage.createBucket('avatars', { public: true }).catch(() => {});

      const extension = avatarFile.name.split('.').pop();
      const filePath = `${user.companyId}/${user.id}/avatar.${extension}`;

      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: avatarFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return NextResponse.json(
          { error: 'Erro ao fazer upload da imagem.' },
          { status: 500 },
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData.publicUrl;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(jobTitle !== null && { jobTitle: jobTitle?.trim() || null }),
        ...(avatarUrl && { avatarUrl }),
      },
      include: { company: true, department: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil.' },
      { status: 500 },
    );
  }
}
