import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { ensureIncentiveTables } from '../../route';

// POST: calculate and generate eligibilities for a program
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureIncentiveTables();

  try {
    // Get program details
    const programs = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM incentive_programs WHERE id = ${params.id} AND company_id = ${user.companyId}
    `;
    if (programs.length === 0) return NextResponse.json({ error: 'Programa não encontrado.' }, { status: 404 });

    const program = programs[0];
    const budget = parseFloat(String(program.total_budget || 0));
    const criteria = (program.eligibility_criteria as Record<string, unknown>) || {};

    // Get all active users in the company
    const allUsers = await prisma.user.findMany({
      where: { companyId: user.companyId, active: true },
      select: { id: true, name: true, createdAt: true, departmentId: true, role: true },
    });

    // Apply eligibility criteria
    const minDays = parseInt(String(criteria.minDaysInCompany || 0));
    const now = new Date();

    const eligibleUsers = allUsers.filter(u => {
      // Min days in company
      if (minDays > 0) {
        const daysInCompany = Math.floor((now.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysInCompany < minDays) return false;
      }
      // Department filter
      if (criteria.departmentId && u.departmentId !== criteria.departmentId) return false;
      // Role filter
      if (criteria.role && u.role !== criteria.role) return false;
      return true;
    });

    // Calculate amount per person (equal distribution for now)
    const amountPerPerson = eligibleUsers.length > 0 ? budget / eligibleUsers.length : 0;

    // Clear existing eligibilities
    await prisma.$executeRaw`
      DELETE FROM incentive_eligibilities WHERE program_id = ${params.id}::uuid
    `;

    // Insert new eligibilities
    let created = 0;
    for (const eu of eligibleUsers) {
      await prisma.$executeRaw`
        INSERT INTO incentive_eligibilities (program_id, user_id, eligible, calculated_amount, performance_score, achievement_percentage)
        VALUES (${params.id}::uuid, ${eu.id}, true, ${amountPerPerson}::decimal, 0, 100)
      `;
      created++;
    }

    return NextResponse.json({
      message: `${created} colaboradores elegíveis calculados.`,
      eligibleCount: created,
      amountPerPerson: Math.round(amountPerPerson * 100) / 100,
    });
  } catch (err) {
    console.error('[Incentives Eligibility] Calc error:', err);
    return NextResponse.json({ error: 'Erro ao calcular elegibilidade.' }, { status: 500 });
  }
}
