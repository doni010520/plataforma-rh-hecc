import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { createNotificationsForMany } from '@/lib/notifications';
import { ensureExperienceTables } from '@/lib/experience-tables';

interface ConfigRow {
  periods: number[];
  template_cycle_id: string | null;
  active: boolean;
}

interface UserMatch {
  id: string;
  name: string;
  email: string;
  company_id: string;
  manager_id: string | null;
  admission_date: Date;
}

// POST: Check for users whose experience evaluation is due today and create cycles
export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  await ensureExperienceTables();

  try {
    // Load config
    const configs = await prisma.$queryRaw<ConfigRow[]>`
      SELECT periods, template_cycle_id, active
      FROM experience_eval_configs
      WHERE company_id = ${user.companyId}
    `;

    if (configs.length === 0 || !configs[0].active) {
      return NextResponse.json({
        message: 'Avaliação de experiência não está ativa.',
        created: 0,
      });
    }

    const config = configs[0];
    const periods: number[] = Array.isArray(config.periods) ? config.periods : [30, 45, 60, 90];

    // Load template criteria if configured
    let templateCriteria: { name: string; description: string; weight: number }[] = [];
    if (config.template_cycle_id) {
      const criteria = await prisma.reviewCriteria.findMany({
        where: { cycleId: config.template_cycle_id },
        select: { name: true, description: true, weight: true },
      });
      templateCriteria = criteria;
    }

    // Default criteria if no template
    if (templateCriteria.length === 0) {
      templateCriteria = [
        { name: 'Adaptação à Cultura', description: 'O colaborador se adaptou bem à cultura e valores da empresa?', weight: 1 },
        { name: 'Desempenho Técnico', description: 'Demonstra competência técnica adequada para a função?', weight: 1 },
        { name: 'Relacionamento', description: 'Mantém bom relacionamento com colegas e gestores?', weight: 1 },
        { name: 'Proatividade', description: 'Demonstra iniciativa e proatividade nas atividades?', weight: 1 },
        { name: 'Comunicação', description: 'Comunica-se de forma clara e eficaz?', weight: 1 },
        { name: 'Pontualidade e Assiduidade', description: 'Cumpre horários e demonstra comprometimento?', weight: 1 },
      ];
    }

    let totalCreated = 0;
    const details: { userName: string; period: number; cycleId: string }[] = [];

    for (const period of periods) {
      // Find users whose admission_date + period days = today
      // AND who don't already have an experience evaluation for this period
      const matchingUsers = await prisma.$queryRaw<UserMatch[]>`
        SELECT u.id, u.name, u.email, u.company_id, u.manager_id, u.admission_date
        FROM users u
        WHERE u.company_id = ${user.companyId}
          AND u.active = true
          AND u.admission_date IS NOT NULL
          AND DATE(u.admission_date + INTERVAL '1 day' * ${period}) = CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM experience_evaluations ee
            WHERE ee.company_id = u.company_id
              AND ee.target_user_id = u.id
              AND ee.period_days = ${period}
          )
      `;

      for (const targetUser of matchingUsers) {
        try {
          // Create ReviewCycle
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7); // 7 days to complete

          const cycle = await prisma.reviewCycle.create({
            data: {
              companyId: user.companyId,
              name: `Experiência ${period}d — ${targetUser.name}`,
              type: 'HALF', // Self + Manager
              startDate: new Date(),
              endDate: dueDate,
              status: 'ACTIVE',
              criteria: {
                create: templateCriteria.map(c => ({
                  name: c.name,
                  description: c.description,
                  weight: c.weight,
                })),
              },
            },
            include: { criteria: true },
          });

          // Create assignments: self-eval
          const selfAssignment = await prisma.reviewAssignment.create({
            data: {
              cycleId: cycle.id,
              evaluatorId: targetUser.id,
              evaluateeId: targetUser.id,
            },
          });
          await prisma.reviewAnswer.createMany({
            data: cycle.criteria.map(c => ({
              assignmentId: selfAssignment.id,
              criteriaId: c.id,
            })),
          });

          // Create assignment: manager eval (if manager exists)
          const notifyUserIds = [targetUser.id];
          if (targetUser.manager_id) {
            const managerAssignment = await prisma.reviewAssignment.create({
              data: {
                cycleId: cycle.id,
                evaluatorId: targetUser.manager_id,
                evaluateeId: targetUser.id,
              },
            });
            await prisma.reviewAnswer.createMany({
              data: cycle.criteria.map(c => ({
                assignmentId: managerAssignment.id,
                criteriaId: c.id,
              })),
            });
            notifyUserIds.push(targetUser.manager_id);
          }

          // Insert experience_evaluations record
          const admDate = targetUser.admission_date.toISOString();
          const dueDateStr = dueDate.toISOString();
          await prisma.$executeRaw`
            INSERT INTO experience_evaluations (company_id, cycle_id, target_user_id, period_days, admission_date, due_date, status)
            VALUES (${user.companyId}, ${cycle.id}, ${targetUser.id}, ${period}, ${admDate}::timestamptz, ${dueDateStr}::timestamptz, 'PENDING')
          `;

          // Send notifications
          createNotificationsForMany(notifyUserIds, {
            companyId: user.companyId,
            type: 'EVALUATION_PENDING',
            title: `Avaliação de Experiência — ${period} dias`,
            body: `Avaliação de experiência de ${targetUser.name} está disponível. Prazo: ${dueDate.toLocaleDateString('pt-BR')}.`,
            link: '/avaliacoes',
          }).catch(() => {});

          totalCreated++;
          details.push({ userName: targetUser.name, period, cycleId: cycle.id });
        } catch (err) {
          console.error(`[Experience Check] Error creating eval for ${targetUser.name}:`, err);
        }
      }
    }

    return NextResponse.json({
      message: `${totalCreated} avaliação(ões) de experiência criada(s).`,
      created: totalCreated,
      details,
    });
  } catch (err) {
    console.error('[Experience Check] Error:', err);
    return NextResponse.json({ error: 'Erro ao verificar avaliações.' }, { status: 500 });
  }
}
