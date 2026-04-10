import { prisma } from '@/lib/prisma';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const DEMO_COMPANY_SLUG = 'feedflow-demo';
export const DEMO_COMPANY_NAME = 'FeedFlow Demo';
export const DEMO_PASSWORD = 'FeedflowDemo2026!';
export const DEMO_ADMIN_EMAIL = 'demo.admin@feedflow-demo.com';
export const DEMO_USER_EMAIL = 'demo.user@feedflow-demo.com';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

interface DemoUserDef {
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  jobTitle: string;
  department: 'Tecnologia' | 'Produto' | 'Pessoas';
  managerEmail?: string;
}

const DEMO_USERS: DemoUserDef[] = [
  // Admin
  { email: DEMO_ADMIN_EMAIL, name: 'Ana Carolina Silva', role: 'ADMIN', jobTitle: 'Diretora de RH', department: 'Pessoas' },

  // Managers
  { email: 'carlos.mendes@feedflow-demo.com', name: 'Carlos Mendes', role: 'MANAGER', jobTitle: 'Head de Tecnologia', department: 'Tecnologia' },
  { email: 'marina.costa@feedflow-demo.com', name: 'Marina Costa', role: 'MANAGER', jobTitle: 'Head de Produto', department: 'Produto' },

  // Employees - Tecnologia
  { email: 'rafael.souza@feedflow-demo.com', name: 'Rafael Souza', role: 'EMPLOYEE', jobTitle: 'Engenheiro de Software Sênior', department: 'Tecnologia', managerEmail: 'carlos.mendes@feedflow-demo.com' },
  { email: 'juliana.lima@feedflow-demo.com', name: 'Juliana Lima', role: 'EMPLOYEE', jobTitle: 'Engenheira de Software Pleno', department: 'Tecnologia', managerEmail: 'carlos.mendes@feedflow-demo.com' },
  { email: 'pedro.alves@feedflow-demo.com', name: 'Pedro Alves', role: 'EMPLOYEE', jobTitle: 'Engenheiro DevOps', department: 'Tecnologia', managerEmail: 'carlos.mendes@feedflow-demo.com' },
  { email: 'beatriz.santos@feedflow-demo.com', name: 'Beatriz Santos', role: 'EMPLOYEE', jobTitle: 'Engenheira QA', department: 'Tecnologia', managerEmail: 'carlos.mendes@feedflow-demo.com' },
  { email: 'lucas.ferreira@feedflow-demo.com', name: 'Lucas Ferreira', role: 'EMPLOYEE', jobTitle: 'Tech Lead', department: 'Tecnologia', managerEmail: 'carlos.mendes@feedflow-demo.com' },

  // Employees - Produto
  { email: 'camila.rocha@feedflow-demo.com', name: 'Camila Rocha', role: 'EMPLOYEE', jobTitle: 'Product Manager', department: 'Produto', managerEmail: 'marina.costa@feedflow-demo.com' },
  { email: 'bruno.oliveira@feedflow-demo.com', name: 'Bruno Oliveira', role: 'EMPLOYEE', jobTitle: 'Product Designer', department: 'Produto', managerEmail: 'marina.costa@feedflow-demo.com' },
  { email: 'fernanda.pereira@feedflow-demo.com', name: 'Fernanda Pereira', role: 'EMPLOYEE', jobTitle: 'UX Researcher', department: 'Produto', managerEmail: 'marina.costa@feedflow-demo.com' },
  { email: 'gabriel.martins@feedflow-demo.com', name: 'Gabriel Martins', role: 'EMPLOYEE', jobTitle: 'Product Analyst', department: 'Produto', managerEmail: 'marina.costa@feedflow-demo.com' },

  // Employees - Pessoas
  { email: DEMO_USER_EMAIL, name: 'Renata Barbosa', role: 'EMPLOYEE', jobTitle: 'Analista de RH Pleno', department: 'Pessoas', managerEmail: DEMO_ADMIN_EMAIL },
  { email: 'thiago.dias@feedflow-demo.com', name: 'Thiago Dias', role: 'EMPLOYEE', jobTitle: 'Business Partner', department: 'Pessoas', managerEmail: DEMO_ADMIN_EMAIL },
  { email: 'larissa.cardoso@feedflow-demo.com', name: 'Larissa Cardoso', role: 'EMPLOYEE', jobTitle: 'Recrutadora', department: 'Pessoas', managerEmail: DEMO_ADMIN_EMAIL },
];

const DEMO_FEEDBACKS = [
  { fromIdx: 1, toIdx: 3, type: 'PRAISE' as const, content: 'Parabéns pela entrega do projeto de migração! Seu trabalho foi impecável e o time toda ficou muito impressionado com sua dedicação e atenção aos detalhes.' },
  { fromIdx: 1, toIdx: 4, type: 'PRAISE' as const, content: 'Juliana, sua apresentação técnica na reunião de sprint foi excelente. Você conseguiu explicar conceitos complexos de forma clara para todos.' },
  { fromIdx: 2, toIdx: 8, type: 'PRAISE' as const, content: 'Camila, o roadmap que você apresentou está muito bem estruturado. O time de stakeholders adorou a clareza da sua visão.' },
  { fromIdx: 0, toIdx: 1, type: 'CONSTRUCTIVE' as const, content: 'Carlos, acho que seria interessante trabalharmos melhor a comunicação com o time de produto. Algumas informações importantes não estão fluindo como deveriam.' },
  { fromIdx: 3, toIdx: 5, type: 'PRAISE' as const, content: 'Beatriz, obrigado pelos testes extensivos no último release. Você encontrou bugs críticos antes de irem para produção.' },
  { fromIdx: 4, toIdx: 2, type: 'REQUEST' as const, content: 'Marina, gostaria de conversar sobre oportunidades de crescimento para engenheiros no time de produto. Podemos agendar um 1:1?' },
  { fromIdx: 6, toIdx: 2, type: 'PRAISE' as const, content: 'Marina, sua liderança durante o último trimestre foi inspiradora. Você soube balancear bem pressão e empatia.' },
  { fromIdx: 8, toIdx: 9, type: 'PRAISE' as const, content: 'Bruno, os designs do novo onboarding estão incríveis! O feedback dos usuários foi extremamente positivo.' },
  { fromIdx: 10, toIdx: 8, type: 'CONSTRUCTIVE' as const, content: 'Camila, acho que poderíamos ter mais sessões de research antes de definir as features. Isso ajudaria a reduzir retrabalho.' },
  { fromIdx: 0, toIdx: 12, type: 'PRAISE' as const, content: 'Renata, seu trabalho na estruturação do processo de onboarding foi excepcional. Os novos colaboradores estão se integrando muito mais rápido.' },
  { fromIdx: 12, toIdx: 0, type: 'PRAISE' as const, content: 'Ana, obrigada pela mentoria nesse trimestre. Aprendi muito com você sobre como conduzir conversas difíceis com empatia.' },
];

const DEMO_OBJECTIVES = [
  { ownerIdx: 1, level: 'TEAM' as const, title: 'Reduzir tempo de deploy em 50%', description: 'Automatizar pipeline de CI/CD e eliminar steps manuais', krs: [
    { title: 'Implementar testes automatizados com 80% de cobertura', startValue: 45, currentValue: 72, targetValue: 80, metricType: 'PERCENTAGE' as const },
    { title: 'Reduzir tempo de build de 15 para 5 minutos', startValue: 15, currentValue: 8, targetValue: 5, metricType: 'NUMBER' as const },
  ]},
  { ownerIdx: 2, level: 'TEAM' as const, title: 'Aumentar NPS do produto para 60', description: 'Focar em UX e estabilidade das features principais', krs: [
    { title: 'NPS acima de 60 pontos', startValue: 42, currentValue: 54, targetValue: 60, metricType: 'NUMBER' as const },
    { title: 'Reduzir bugs reportados em 40%', startValue: 120, currentValue: 85, targetValue: 72, metricType: 'NUMBER' as const },
  ]},
  { ownerIdx: 0, level: 'COMPANY' as const, title: 'Melhorar retenção de talentos', description: 'Reduzir turnover voluntário e aumentar engajamento', krs: [
    { title: 'Turnover voluntário abaixo de 8%', startValue: 14, currentValue: 10, targetValue: 8, metricType: 'PERCENTAGE' as const },
    { title: 'eNPS acima de 50', startValue: 32, currentValue: 44, targetValue: 50, metricType: 'NUMBER' as const },
  ]},
  { ownerIdx: 3, level: 'INDIVIDUAL' as const, title: 'Dominar arquitetura de microsserviços', description: 'Plano de desenvolvimento técnico pessoal', krs: [
    { title: 'Concluir curso avançado de Kubernetes', startValue: 0, currentValue: 1, targetValue: 1, metricType: 'BOOLEAN' as const },
    { title: 'Liderar 2 projetos de refatoração', startValue: 0, currentValue: 1, targetValue: 2, metricType: 'NUMBER' as const },
  ]},
  { ownerIdx: 8, level: 'INDIVIDUAL' as const, title: 'Lançar nova feature de analytics', description: 'Entregar dashboard de analytics com ML', krs: [
    { title: 'Pesquisas com usuários completas', startValue: 0, currentValue: 12, targetValue: 15, metricType: 'NUMBER' as const },
    { title: 'MVP lançado até final do trimestre', startValue: 0, currentValue: 0, targetValue: 1, metricType: 'BOOLEAN' as const },
  ]},
];

const DEMO_CELEBRATIONS = [
  { authorIdx: 3, type: 'ACHIEVEMENT' as const, content: 'Acabamos de fechar o maior contrato da história da empresa! 🎉 Parabéns ao time de vendas pelo trabalho incrível!' },
  { authorIdx: 8, type: 'ACHIEVEMENT' as const, content: 'Nossa nova feature de relatórios foi lançada hoje e já temos 200+ usuários ativos. Obrigada a todos que contribuíram! 🚀' },
  { authorIdx: 0, type: 'ANNIVERSARY' as const, content: 'Hoje o @Rafael Souza completa 3 anos de casa! Obrigada por toda sua dedicação e excelência técnica. 🎂' },
  { authorIdx: 2, type: 'BIRTHDAY' as const, content: 'Feliz aniversário, @Juliana Lima! Que esse novo ano traga muitas conquistas profissionais e pessoais! 🎈' },
  { authorIdx: 1, type: 'GENERAL' as const, content: 'Time de Tecnologia bateu 100% dos OKRs do trimestre! Que orgulho fazer parte desse grupo. 💪' },
  { authorIdx: 10, type: 'ACHIEVEMENT' as const, content: 'Publiquei meu primeiro artigo técnico no blog da empresa! Obrigada ao @Carlos Mendes pelo incentivo e revisão. ✍️' },
  { authorIdx: 12, type: 'GENERAL' as const, content: 'Hoje tivemos nossa primeira sessão de "Coffee Talk" e foi incrível! Mais de 20 pessoas participaram. ☕' },
];

const DEMO_ANNOUNCEMENTS = [
  { title: 'Nova política de home office', content: 'A partir do próximo mês, todos os colaboradores poderão escolher o modelo de trabalho (presencial, híbrido ou remoto). Mais detalhes no documento anexo.' },
  { title: 'Reunião All Hands — Resultados do Q1', content: 'Nossa reunião trimestral acontecerá na próxima sexta-feira às 15h. Vamos apresentar os resultados, celebrar conquistas e anunciar novidades. Participação obrigatória.' },
  { title: 'Programa de Indicação 2.0', content: 'Relançamos nosso programa de indicação com valores maiores e mais benefícios. Indique talentos e ganhe até R$ 3.000 por contratação efetivada.' },
];

export async function seedDemoCompany() {
  const supabase = getSupabaseAdmin();

  // 1. Clean up any existing demo company first
  await cleanupDemoCompany();

  // 2. Create company
  const company = await prisma.company.create({
    data: {
      name: DEMO_COMPANY_NAME,
      slug: DEMO_COMPANY_SLUG + '-' + Date.now().toString(36), // unique slug
    },
  });

  // 3. Create departments
  const deptTech = await prisma.department.create({
    data: { name: 'Tecnologia', companyId: company.id },
  });
  const deptProd = await prisma.department.create({
    data: { name: 'Produto', companyId: company.id },
  });
  const deptPeople = await prisma.department.create({
    data: { name: 'Pessoas', companyId: company.id },
  });
  const deptMap = { Tecnologia: deptTech.id, Produto: deptProd.id, Pessoas: deptPeople.id };

  // 4. Create users in Supabase Auth + database
  const userMap: Record<string, string> = {}; // email → userId
  const createdUsers: { email: string; id: string; idx: number }[] = [];

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const def = DEMO_USERS[i];

    // Create in Supabase Auth (with password)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: def.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { has_set_password: true, demo: true },
    });

    if (authError || !authData.user) {
      console.error(`[Demo Seed] Failed to create auth user ${def.email}:`, authError);
      continue;
    }

    const dbUser = await prisma.user.create({
      data: {
        authId: authData.user.id,
        companyId: company.id,
        email: def.email,
        name: def.name,
        role: def.role,
        jobTitle: def.jobTitle,
        departmentId: deptMap[def.department],
      },
    });

    userMap[def.email] = dbUser.id;
    createdUsers.push({ email: def.email, id: dbUser.id, idx: i });
  }

  // 5. Set managers (second pass)
  for (const def of DEMO_USERS) {
    if (def.managerEmail && userMap[def.email] && userMap[def.managerEmail]) {
      await prisma.user.update({
        where: { id: userMap[def.email] },
        data: { managerId: userMap[def.managerEmail] },
      });
    }
  }

  const idxToId = (idx: number) => createdUsers.find(u => u.idx === idx)?.id;

  // 6. Create feedbacks
  for (const fb of DEMO_FEEDBACKS) {
    const fromId = idxToId(fb.fromIdx);
    const toId = idxToId(fb.toIdx);
    if (!fromId || !toId) continue;
    await prisma.feedback.create({
      data: {
        companyId: company.id,
        fromUserId: fromId,
        toUserId: toId,
        type: fb.type,
        content: fb.content,
        visibility: 'PUBLIC',
      },
    });
  }

  // 7. Create OKRs with key results
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = new Date().getFullYear();

  for (const obj of DEMO_OBJECTIVES) {
    const ownerId = idxToId(obj.ownerIdx);
    if (!ownerId) continue;

    const objective = await prisma.objective.create({
      data: {
        companyId: company.id,
        ownerId,
        title: obj.title,
        description: obj.description,
        level: obj.level,
        quarter: currentQuarter,
        year: currentYear,
        status: 'ON_TRACK',
      },
    });

    for (const kr of obj.krs) {
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: kr.title,
          startValue: kr.startValue,
          currentValue: kr.currentValue,
          targetValue: kr.targetValue,
          metricType: kr.metricType,
        },
      });
    }
  }

  // 8. Create celebrations (mural)
  for (const cel of DEMO_CELEBRATIONS) {
    const authorId = idxToId(cel.authorIdx);
    if (!authorId) continue;
    await prisma.celebration.create({
      data: {
        companyId: company.id,
        authorId,
        type: cel.type,
        content: cel.content,
      },
    });
  }

  // 9. Create announcements (from admin)
  const adminId = idxToId(0);
  if (adminId) {
    for (const ann of DEMO_ANNOUNCEMENTS) {
      await prisma.announcement.create({
        data: {
          companyId: company.id,
          authorId: adminId,
          title: ann.title,
          content: ann.content,
          targetDepartments: '[]',
          sentAt: new Date(),
        },
      });
    }
  }

  // 10. Award gamification points
  for (const u of createdUsers) {
    const points = Math.floor(Math.random() * 300) + 50;
    await prisma.gamificationPoints.create({
      data: {
        companyId: company.id,
        userId: u.id,
        points,
        reason: 'Pontos acumulados (demo)',
        sourceType: 'DEMO_SEED',
      },
    });
  }

  return {
    companyId: company.id,
    companyName: company.name,
    usersCreated: createdUsers.length,
    feedbacks: DEMO_FEEDBACKS.length,
    objectives: DEMO_OBJECTIVES.length,
    celebrations: DEMO_CELEBRATIONS.length,
    announcements: DEMO_ANNOUNCEMENTS.length,
  };
}

export async function cleanupDemoCompany() {
  const supabase = getSupabaseAdmin();

  // Find all demo companies (can be multiple if seed ran multiple times)
  const companies = await prisma.company.findMany({
    where: { name: DEMO_COMPANY_NAME },
    include: { users: true },
  });

  for (const company of companies) {
    // Delete all Supabase Auth users
    for (const u of company.users) {
      if (u.authId) {
        await supabase.auth.admin.deleteUser(u.authId).catch(() => {});
      }
    }

    // Delete company (cascade removes all related data if schema allows)
    // Manual cleanup in case cascade is not configured
    await prisma.$transaction(async (tx) => {
      const userIds = company.users.map(u => u.id);

      // Delete in order to avoid FK errors
      await tx.gamificationPoints.deleteMany({ where: { companyId: company.id } });
      await tx.celebration.deleteMany({ where: { companyId: company.id } });
      await tx.announcement.deleteMany({ where: { companyId: company.id } });
      await tx.feedback.deleteMany({ where: { companyId: company.id } });
      await tx.keyResult.deleteMany({ where: { objective: { companyId: company.id } } });
      await tx.objective.deleteMany({ where: { companyId: company.id } });
      await tx.moodLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { companyId: company.id } });
      await tx.user.deleteMany({ where: { companyId: company.id } });
      await tx.department.deleteMany({ where: { companyId: company.id } });
      await tx.company.delete({ where: { id: company.id } });
    }).catch((err) => {
      console.error('[Demo Cleanup] Error:', err);
    });
  }
}
