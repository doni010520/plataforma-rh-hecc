import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  // Fetch full profile with relations
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      department: { select: { id: true, name: true } },
      company: { select: { name: true } },
      manager: { select: { id: true, name: true } },
    },
  });

  if (!fullUser) return unauthorizedResponse();

  return NextResponse.json({
    id: fullUser.id,
    name: fullUser.name,
    email: fullUser.email,
    role: fullUser.role,
    jobTitle: fullUser.jobTitle,
    avatarUrl: fullUser.avatarUrl,
    departmentId: fullUser.departmentId,
    companyId: fullUser.companyId,
    department: fullUser.department,
    company: fullUser.company,
    manager: fullUser.manager,
    createdAt: fullUser.createdAt,
  });
}
