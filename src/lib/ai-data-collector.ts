import { prisma } from '@/lib/prisma';

// ── Company Overview ──

export async function collectCompanyOverview(companyId: string): Promise<string> {
  const [
    employeeCount,
    departments,
    moodLogs,
    openComplaints,
    activePdis,
    activeSurveys,
  ] = await Promise.all([
    prisma.user.count({ where: { companyId, active: true } }),
    prisma.department.findMany({
      where: { companyId },
      select: { name: true, _count: { select: { users: true } } },
    }),
    prisma.moodLog.findMany({
      where: {
        user: { companyId },
        date: { gte: daysAgo(30) },
      },
      select: { mood: true },
    }),
    prisma.complaint.count({ where: { companyId, status: 'OPEN' } }),
    prisma.developmentPlan.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.survey.count({ where: { companyId, status: 'ACTIVE' } }),
  ]);

  const avgMood = moodLogs.length > 0
    ? (moodLogs.reduce((a, m) => a + m.mood, 0) / moodLogs.length).toFixed(1)
    : 'Sem dados';

  const deptList = departments
    .map(d => `  - ${d.name}: ${d._count.users} colaboradores`)
    .join('\n');

  return `=== VISÃO GERAL DA EMPRESA ===
Total de colaboradores ativos: ${employeeCount}
Departamentos:
${deptList || '  Nenhum departamento cadastrado'}
Humor médio (últimos 30 dias): ${avgMood}/10
Denúncias abertas: ${openComplaints}
PDIs ativos: ${activePdis}
Pesquisas ativas: ${activeSurveys}`;
}

// ── Department Data ──

export async function collectDepartmentData(
  companyId: string,
  departmentId?: string,
): Promise<string> {
  const ninetyDaysAgo = daysAgo(90);

  const departments = await prisma.department.findMany({
    where: { companyId, ...(departmentId ? { id: departmentId } : {}) },
    select: { id: true, name: true },
  });

  const sections: string[] = [];

  for (const dept of departments) {
    const employees = await prisma.user.findMany({
      where: { companyId, departmentId: dept.id, active: true },
      select: { id: true, name: true, jobTitle: true },
    });

    if (employees.length === 0) continue;

    const empIds = employees.map(e => e.id);

    // Mood averages
    const moods = await prisma.moodLog.findMany({
      where: { userId: { in: empIds }, date: { gte: ninetyDaysAgo } },
      select: { mood: true },
    });
    const avgMood = moods.length > 0
      ? (moods.reduce((a, m) => a + m.mood, 0) / moods.length).toFixed(1)
      : 'N/A';

    // Feedback distribution
    const feedbacks = await prisma.feedback.findMany({
      where: { toUserId: { in: empIds }, companyId, createdAt: { gte: ninetyDaysAgo } },
      select: { type: true },
    });
    const fbCounts = { PRAISE: 0, CONSTRUCTIVE: 0, REQUEST: 0 };
    feedbacks.forEach(f => { if (f.type in fbCounts) fbCounts[f.type as keyof typeof fbCounts]++; });

    // OKR status
    const objectives = await prisma.objective.findMany({
      where: { companyId, ownerId: { in: empIds } },
      select: { status: true },
    });
    const okrCounts = { ON_TRACK: 0, AT_RISK: 0, ACHIEVED: 0, OTHER: 0 };
    objectives.forEach(o => {
      if (o.status in okrCounts) okrCounts[o.status as keyof typeof okrCounts]++;
      else okrCounts.OTHER++;
    });

    sections.push(`--- ${dept.name} (${employees.length} colaboradores) ---
Colaboradores: ${employees.map(e => `${e.name} (${e.jobTitle || 'sem cargo'})`).join(', ')}
Humor médio (90d): ${avgMood}/10
Feedbacks (90d): ${feedbacks.length} total (${fbCounts.PRAISE} elogios, ${fbCounts.CONSTRUCTIVE} construtivos, ${fbCounts.REQUEST} solicitações)
OKRs: ${okrCounts.ON_TRACK} no prazo, ${okrCounts.AT_RISK} em risco, ${okrCounts.ACHIEVED} alcançados`);
  }

  return `=== DADOS POR DEPARTAMENTO ===\n${sections.join('\n\n') || 'Sem dados de departamentos.'}`;
}

// ── Employee Turnover Signals ──

export async function collectEmployeeTurnoverSignals(
  companyId: string,
  departmentId?: string,
): Promise<string> {
  const ninetyDaysAgo = daysAgo(90);
  const thirtyDaysAgo = daysAgo(30);
  const sixtyDaysAgo = daysAgo(60);
  const twelveMonthsAgo = daysAgo(365);

  const employees = await prisma.user.findMany({
    where: { companyId, active: true, ...(departmentId ? { departmentId } : {}) },
    select: { id: true, name: true, jobTitle: true, department: { select: { name: true } } },
  });

  if (employees.length === 0) return 'Nenhum colaborador encontrado.';

  const empIds = employees.map(e => e.id);

  // Batch queries
  const [allMoods, allFeedbacks, allSalaryChanges, allDevPlans, allComplaints] =
    await Promise.all([
      prisma.moodLog.findMany({
        where: { userId: { in: empIds }, date: { gte: ninetyDaysAgo } },
        select: { userId: true, mood: true, date: true },
      }),
      prisma.feedback.findMany({
        where: { toUserId: { in: empIds }, companyId, createdAt: { gte: ninetyDaysAgo } },
        select: { toUserId: true, type: true },
      }),
      prisma.salaryHistory.findMany({
        where: { userId: { in: empIds }, effectiveDate: { gte: twelveMonthsAgo } },
        select: { userId: true },
      }),
      prisma.developmentPlan.findMany({
        where: { userId: { in: empIds }, status: 'ACTIVE' },
        select: { userId: true },
      }),
      prisma.complaint.findMany({
        where: { authorId: { in: empIds }, createdAt: { gte: daysAgo(180) } },
        select: { authorId: true },
      }),
    ]);

  // Performance scores
  const latestCycle = await prisma.reviewCycle.findFirst({
    where: { companyId, status: 'CLOSED' },
    orderBy: { endDate: 'desc' },
    select: { id: true },
  });

  const perfScores: Record<string, number> = {};
  if (latestCycle) {
    const answers = await prisma.reviewAnswer.findMany({
      where: {
        assignment: { cycleId: latestCycle.id, evaluateeId: { in: empIds }, status: 'DONE' },
      },
      select: { score: true, assignment: { select: { evaluateeId: true } } },
    });
    const perfMap: Record<string, number[]> = {};
    answers.forEach(a => {
      if (a.score != null) {
        const uid = a.assignment.evaluateeId;
        if (!perfMap[uid]) perfMap[uid] = [];
        perfMap[uid].push(a.score);
      }
    });
    for (const [uid, scores] of Object.entries(perfMap)) {
      perfScores[uid] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  // Group data per employee
  const moodsByUser: Record<string, { mood: number; date: Date }[]> = {};
  allMoods.forEach(m => {
    if (!moodsByUser[m.userId]) moodsByUser[m.userId] = [];
    moodsByUser[m.userId].push({ mood: m.mood, date: m.date });
  });

  const feedbackByUser: Record<string, number> = {};
  allFeedbacks.forEach(f => {
    feedbackByUser[f.toUserId] = (feedbackByUser[f.toUserId] || 0) + 1;
  });

  const hasSalaryChange = new Set(allSalaryChanges.map(s => s.userId));
  const hasDevPlan = new Set(allDevPlans.map(d => d.userId));
  const complaintsByUser: Record<string, number> = {};
  allComplaints.forEach(c => {
    if (c.authorId) complaintsByUser[c.authorId] = (complaintsByUser[c.authorId] || 0) + 1;
  });

  const lines: string[] = [];

  for (const emp of employees) {
    const moods = moodsByUser[emp.id] || [];
    let moodInfo = 'Sem dados de humor';
    let moodTrend = '';

    if (moods.length > 0) {
      const avgAll = moods.reduce((a, m) => a + m.mood, 0) / moods.length;
      const recent = moods.filter(m => m.date >= thirtyDaysAgo);
      const older = moods.filter(m => m.date < thirtyDaysAgo && m.date >= sixtyDaysAgo);

      if (recent.length > 0 && older.length > 0) {
        const avgRecent = recent.reduce((a, m) => a + m.mood, 0) / recent.length;
        const avgOlder = older.reduce((a, m) => a + m.mood, 0) / older.length;
        const diff = avgRecent - avgOlder;
        moodTrend = diff < -1 ? ' (tendência: DECLINANTE)' : diff > 1 ? ' (tendência: crescente)' : ' (tendência: estável)';
      }
      moodInfo = `${avgAll.toFixed(1)}/10${moodTrend}`;
    }

    const perf = perfScores[emp.id];
    const fbCount = feedbackByUser[emp.id] || 0;
    const salaryStagnant = !hasSalaryChange.has(emp.id);
    const hasPdi = hasDevPlan.has(emp.id);
    const complaintCount = complaintsByUser[emp.id] || 0;

    lines.push(`Colaborador: ${emp.name} (${emp.jobTitle || 'sem cargo'}, ${emp.department?.name || 'sem depto'}) [ID: ${emp.id}]
  - Humor médio (90d): ${moodInfo}
  - Performance: ${perf ? `${perf.toFixed(1)}/5` : 'Sem avaliação'}
  - Feedbacks recebidos (90d): ${fbCount}
  - Ajuste salarial nos últimos 12 meses: ${salaryStagnant ? 'NÃO' : 'Sim'}
  - PDI ativo: ${hasPdi ? 'Sim' : 'Não'}
  - Denúncias (6 meses): ${complaintCount}`);
  }

  return `=== SINAIS DE TURNOVER POR COLABORADOR ===\n${lines.join('\n\n')}`;
}

// ── Chat Context (lighter) ──

export async function collectChatContext(
  companyId: string,
  scope?: { departmentId?: string },
): Promise<string> {
  const [employeeCount, departments, moodLogs, recentAlerts] = await Promise.all([
    prisma.user.count({ where: { companyId, active: true } }),
    prisma.department.findMany({
      where: { companyId },
      select: { id: true, name: true, _count: { select: { users: true } } },
    }),
    prisma.moodLog.findMany({
      where: { user: { companyId }, date: { gte: daysAgo(30) } },
      select: { mood: true },
    }),
    prisma.aiAlert.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, message: true, priority: true, createdAt: true },
    }),
  ]);

  const avgMood = moodLogs.length > 0
    ? (moodLogs.reduce((a, m) => a + m.mood, 0) / moodLogs.length).toFixed(1)
    : 'Sem dados';

  const deptList = departments
    .map(d => `${d.name} (${d._count.users} pessoas)`)
    .join(', ');

  const alertList = recentAlerts.length > 0
    ? recentAlerts.map(a => `- [${a.priority}] ${a.title}: ${a.message}`).join('\n')
    : 'Nenhum alerta recente.';

  let deptDetail = '';
  if (scope?.departmentId) {
    const dept = departments.find(d => d.id === scope.departmentId);
    if (dept) {
      const deptEmployees = await prisma.user.findMany({
        where: { companyId, departmentId: scope.departmentId, active: true },
        select: { name: true, jobTitle: true },
      });
      deptDetail = `\nDepartamento em foco: ${dept.name}\nColaboradores: ${deptEmployees.map(e => `${e.name} (${e.jobTitle || 'sem cargo'})`).join(', ')}`;
    }
  }

  return `=== CONTEXTO DA EMPRESA ===
Colaboradores ativos: ${employeeCount}
Departamentos: ${deptList || 'Nenhum'}
Humor médio (30d): ${avgMood}/10${deptDetail}

Alertas recentes:
${alertList}`;
}

// ── Helpers ──

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
