import { prisma } from '@/lib/prisma';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

// ============================================================
// FeedFlow Demo — Sabor & Arte Restaurante
// Dados fictícios para apresentação comercial
// ============================================================

export const DEMO_COMPANY_NAME = 'Sabor & Arte Restaurante';
export const DEMO_PASSWORD = 'FeedflowDemo2026!';
export const DEMO_ADMIN_EMAIL = 'demo.admin@saborarte-demo.com';
export const DEMO_MANAGER_EMAIL = 'chef.rodrigo@saborarte-demo.com';
export const DEMO_USER_EMAIL = 'larissa.garcom@saborarte-demo.com';

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
  department: 'Cozinha' | 'Salão' | 'Bar' | 'Delivery' | 'Administrativo';
  managerIdx?: number;
  admissionDaysAgo?: number;
}

const DEMO_USERS: DemoUserDef[] = [
  // 0 — Admin (Gerente Geral)
  { email: DEMO_ADMIN_EMAIL, name: 'Patrícia Moraes', role: 'ADMIN', jobTitle: 'Gerente Geral', department: 'Administrativo', admissionDaysAgo: 1825 },

  // 1 — Chef Executivo (Manager da Cozinha)
  { email: DEMO_MANAGER_EMAIL, name: 'Rodrigo Bianchi', role: 'MANAGER', jobTitle: 'Chef Executivo', department: 'Cozinha', managerIdx: 0, admissionDaysAgo: 1460 },

  // 2 — Maître (Manager do Salão)
  { email: 'eduardo.maitre@saborarte-demo.com', name: 'Eduardo Passos', role: 'MANAGER', jobTitle: 'Maître', department: 'Salão', managerIdx: 0, admissionDaysAgo: 1200 },

  // 3 — Gerente de Operações (Manager do Bar/Delivery/Admin)
  { email: 'debora.operacoes@saborarte-demo.com', name: 'Débora Freitas', role: 'MANAGER', jobTitle: 'Gerente de Operações', department: 'Administrativo', managerIdx: 0, admissionDaysAgo: 1095 },

  // Cozinha (4-11)
  { email: 'fernanda.souschef@saborarte-demo.com', name: 'Fernanda Tanaka', role: 'EMPLOYEE', jobTitle: 'Sous-chef', department: 'Cozinha', managerIdx: 1, admissionDaysAgo: 900 },
  { email: 'matheus.chapa@saborarte-demo.com', name: 'Matheus Oliveira', role: 'EMPLOYEE', jobTitle: 'Cozinheiro de Chapa', department: 'Cozinha', managerIdx: 1, admissionDaysAgo: 720 },
  { email: 'giovanna.massas@saborarte-demo.com', name: 'Giovanna Rossi', role: 'EMPLOYEE', jobTitle: 'Cozinheira de Massas', department: 'Cozinha', managerIdx: 1, admissionDaysAgo: 540 },
  { email: 'paulo.grelhados@saborarte-demo.com', name: 'Paulo Henrique Santos', role: 'EMPLOYEE', jobTitle: 'Cozinheiro de Grelhados', department: 'Cozinha', managerIdx: 1, admissionDaysAgo: 380 },
  { email: 'amanda.confeitaria@saborarte-demo.com', name: 'Amanda Ribeiro', role: 'EMPLOYEE', jobTitle: 'Confeiteira', department: 'Cozinha', managerIdx: 1, admissionDaysAgo: 270 },
  { email: 'joao.auxcozinha@saborarte-demo.com', name: 'João Victor Pereira', role: 'EMPLOYEE', jobTitle: 'Auxiliar de Cozinha', department: 'Cozinha', managerIdx: 4, admissionDaysAgo: 150 },
  { email: 'mariaeduarda.auxcozinha@saborarte-demo.com', name: 'Maria Eduarda Alves', role: 'EMPLOYEE', jobTitle: 'Auxiliar de Cozinha', department: 'Cozinha', managerIdx: 4, admissionDaysAgo: 45 },
  { email: 'sergio.lavador@saborarte-demo.com', name: 'Sérgio Dantas', role: 'EMPLOYEE', jobTitle: 'Steward (Lavagem)', department: 'Cozinha', managerIdx: 4, admissionDaysAgo: 600 },

  // Salão (12-18)
  { email: 'thiago.garcom@saborarte-demo.com', name: 'Thiago Rocha', role: 'EMPLOYEE', jobTitle: 'Garçom Sênior', department: 'Salão', managerIdx: 2, admissionDaysAgo: 780 },
  { email: DEMO_USER_EMAIL, name: 'Larissa Mendes', role: 'EMPLOYEE', jobTitle: 'Garçonete', department: 'Salão', managerIdx: 2, admissionDaysAgo: 420 },
  { email: 'bruno.garcom@saborarte-demo.com', name: 'Bruno Cardoso', role: 'EMPLOYEE', jobTitle: 'Garçom', department: 'Salão', managerIdx: 2, admissionDaysAgo: 310 },
  { email: 'camila.garconete@saborarte-demo.com', name: 'Camila Vasconcelos', role: 'EMPLOYEE', jobTitle: 'Garçonete', department: 'Salão', managerIdx: 2, admissionDaysAgo: 180 },
  { email: 'rafaela.commis@saborarte-demo.com', name: 'Rafaela Souza', role: 'EMPLOYEE', jobTitle: 'Commis', department: 'Salão', managerIdx: 2, admissionDaysAgo: 90 },
  { email: 'isabela.hostess@saborarte-demo.com', name: 'Isabela Marques', role: 'EMPLOYEE', jobTitle: 'Hostess / Recepcionista', department: 'Salão', managerIdx: 2, admissionDaysAgo: 240 },
  { email: 'vinicius.caixa@saborarte-demo.com', name: 'Vinícius Lima', role: 'EMPLOYEE', jobTitle: 'Operador de Caixa', department: 'Salão', managerIdx: 2, admissionDaysAgo: 500 },

  // Bar (19-20)
  { email: 'leonardo.bartender@saborarte-demo.com', name: 'Leonardo Barreto', role: 'EMPLOYEE', jobTitle: 'Bartender', department: 'Bar', managerIdx: 3, admissionDaysAgo: 660 },
  { email: 'pedro.auxbar@saborarte-demo.com', name: 'Pedro Ramos', role: 'EMPLOYEE', jobTitle: 'Auxiliar de Bar', department: 'Bar', managerIdx: 3, admissionDaysAgo: 120 },

  // Delivery (21-23)
  { email: 'alexandre.deliverylider@saborarte-demo.com', name: 'Alexandre Ferreira', role: 'EMPLOYEE', jobTitle: 'Líder de Delivery', department: 'Delivery', managerIdx: 3, admissionDaysAgo: 450 },
  { email: 'carlos.motoboy@saborarte-demo.com', name: 'Carlos Eduardo Souza', role: 'EMPLOYEE', jobTitle: 'Motoboy', department: 'Delivery', managerIdx: 21, admissionDaysAgo: 200 },
  { email: 'julia.empacotadora@saborarte-demo.com', name: 'Júlia Martins', role: 'EMPLOYEE', jobTitle: 'Empacotadora', department: 'Delivery', managerIdx: 21, admissionDaysAgo: 75 },

  // Administrativo (24-25)
  { email: 'marcelo.compras@saborarte-demo.com', name: 'Marcelo Teixeira', role: 'EMPLOYEE', jobTitle: 'Comprador / Estoquista', department: 'Administrativo', managerIdx: 3, admissionDaysAgo: 800 },
  { email: 'roberta.financeiro@saborarte-demo.com', name: 'Roberta Nunes', role: 'EMPLOYEE', jobTitle: 'Analista Financeiro', department: 'Administrativo', managerIdx: 3, admissionDaysAgo: 950 },
];

// ============================================================
// Helper: random mood log for last N days
// ============================================================
function randomMood(): number {
  const weights = [0.05, 0.15, 0.30, 0.35, 0.15];
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r < cum) return i + 1;
  }
  return 4;
}

// ============================================================
// Main seed function
// ============================================================
export async function seedDemoCompany() {
  const supabase = getSupabaseAdmin();

  // Ensure admission_date column exists on users table
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_date TIMESTAMPTZ
    `);
  } catch {
    // Column already exists or permission issue — continue
  }

  // Clean up first
  await cleanupDemoCompany();

  // Company
  const company = await prisma.company.create({
    data: {
      name: DEMO_COMPANY_NAME,
      slug: 'sabor-arte-' + Date.now().toString(36),
    },
  });
  const companyId = company.id;

  // Departments
  const depts: Record<string, string> = {};
  for (const name of ['Cozinha', 'Salão', 'Bar', 'Delivery', 'Administrativo']) {
    const d = await prisma.department.create({
      data: { name, companyId },
    });
    depts[name] = d.id;
  }

  // Users
  const userIds: string[] = [];
  for (let i = 0; i < DEMO_USERS.length; i++) {
    const def = DEMO_USERS[i];
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: def.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { has_set_password: true, demo: true },
    });

    if (authError || !authData.user) {
      console.error(`[Demo] Failed creating ${def.email}:`, authError);
      userIds.push('');
      continue;
    }

    const user = await prisma.user.create({
      data: {
        authId: authData.user.id,
        companyId,
        email: def.email,
        name: def.name,
        role: def.role,
        jobTitle: def.jobTitle,
        departmentId: depts[def.department],
      },
    });

    // Set admission date via raw SQL
    if (def.admissionDaysAgo) {
      const admission = new Date();
      admission.setDate(admission.getDate() - def.admissionDaysAgo);
      await prisma.$executeRaw`UPDATE users SET admission_date = ${admission} WHERE id = ${user.id}`;
    }

    userIds.push(user.id);
  }

  // Set managers (second pass)
  for (let i = 0; i < DEMO_USERS.length; i++) {
    const def = DEMO_USERS[i];
    if (def.managerIdx !== undefined && userIds[i] && userIds[def.managerIdx]) {
      await prisma.user.update({
        where: { id: userIds[i] },
        data: { managerId: userIds[def.managerIdx] },
      });
    }
  }

  // Create all modules
  await seedFeedbacks(companyId, userIds);
  await seedOkrs(companyId, userIds);
  await seedCelebrations(companyId, userIds);
  await seedAnnouncements(companyId, userIds[0]);
  await seedGamification(companyId, userIds);
  await seedMoodLogs(companyId, userIds);
  await seedNr01(companyId, userIds);
  await seedSurveys(companyId);
  await seedEnps(companyId, userIds);
  await seedDisc(companyId, userIds);
  await seedReviews(companyId, userIds);
  await seedPdi(companyId, userIds);
  await seedOneOnOne(companyId, userIds);
  await seedOnboarding(companyId, userIds);
  await seedTracks(companyId, userIds);
  await seedRecruitment(companyId, userIds[0]);
  await seedNotifications(companyId, userIds);

  return {
    companyId,
    companyName: company.name,
    usersCreated: userIds.filter(id => id).length,
  };
}

// ============================================================
// Feedbacks
// ============================================================
async function seedFeedbacks(companyId: string, u: string[]) {
  const feedbacks = [
    { from: 1, to: 4, type: 'PRAISE', content: 'Fernanda, sua condução da cozinha no sábado à noite foi impressionante! Mesmo com a casa lotada, você manteve a calma e coordenou toda a brigada. Parabéns pela liderança.' },
    { from: 1, to: 5, type: 'PRAISE', content: 'Matheus, você está cada vez mais rápido na chapa. O tempo médio de saída dos pratos caiu 20% desde que você assumiu. Excelente trabalho!' },
    { from: 1, to: 6, type: 'PRAISE', content: 'Giovanna, as massas do novo cardápio estão no ponto perfeito. Vários clientes comentaram no Google. Continue assim!' },
    { from: 2, to: 12, type: 'PRAISE', content: 'Thiago, você é a referência do salão. Sempre atento, sempre sorrindo, sempre com a palavra certa. Obrigado pela dedicação de tantos anos.' },
    { from: 2, to: 13, type: 'PRAISE', content: 'Larissa, seu atendimento na mesa do aniversário de 60 anos no domingo foi comentado por toda a família. Eles vão voltar só por causa de você.' },
    { from: 13, to: 16, type: 'PRAISE', content: 'Rafaela, você está pegando o jeito muito rápido. Obrigada por ter me ajudado ontem quando recebi 4 mesas ao mesmo tempo!' },
    { from: 0, to: 1, type: 'CONSTRUCTIVE', content: 'Chef, precisamos conversar sobre a comunicação entre cozinha e salão nos horários de pico. Alguns pedidos estão saindo com atraso sem aviso. Que tal criarmos um sinal visual?' },
    { from: 0, to: 2, type: 'CONSTRUCTIVE', content: 'Eduardo, notei que alguns garçons novos estão com dúvidas sobre o cardápio de drinks. Seria interessante uma sessão de treinamento rápida toda semana.' },
    { from: 1, to: 9, type: 'CONSTRUCTIVE', content: 'João, preciso que você mantenha a bancada mais organizada durante o serviço. Isso ajuda toda a equipe a ser mais ágil. Conta comigo pra te ajudar.' },
    { from: 2, to: 14, type: 'REQUEST', content: 'Bruno, pode passar a usar o sistema de pedidos no tablet em vez da comanda manual? Está causando retrabalho na cozinha.' },
    { from: 4, to: 1, type: 'REQUEST', content: 'Chef, gostaria de agendar um 1:1 para conversarmos sobre um plano de desenvolvimento. Tenho interesse em crescer na carreira dentro da cozinha.' },
    { from: 12, to: 0, type: 'PRAISE', content: 'Patrícia, a reforma do vestiário ficou incrível! É muito bom chegar no trabalho e encontrar um ambiente limpo e confortável. Obrigado por pensar na gente.' },
    { from: 19, to: 3, type: 'PRAISE', content: 'Débora, o novo menu de drinks está fazendo muito sucesso. Obrigado por ter acreditado nas minhas sugestões!' },
    { from: 3, to: 21, type: 'PRAISE', content: 'Alexandre, o tempo de entrega do delivery caiu para média de 32 minutos. Parabéns pela organização do time!' },
    { from: 21, to: 22, type: 'CONSTRUCTIVE', content: 'Carlos, por favor tenha atenção redobrada ao conferir os pedidos antes de sair. Tivemos 2 reclamações essa semana de itens faltando.' },
    { from: 0, to: 3, type: 'PRAISE', content: 'Débora, sua gestão do estoque esse mês economizou R$ 8 mil. Impressionante o olhar que você tem para oportunidades de melhoria.' },
  ];

  for (const f of feedbacks) {
    if (!u[f.from] || !u[f.to]) continue;
    await prisma.feedback.create({
      data: {
        companyId,
        fromUserId: u[f.from],
        toUserId: u[f.to],
        type: f.type as 'PRAISE' | 'CONSTRUCTIVE' | 'REQUEST',
        content: f.content,
        visibility: 'PUBLIC',
      },
    });
  }
}

// ============================================================
// OKRs
// ============================================================
async function seedOkrs(companyId: string, u: string[]) {
  const q = Math.ceil((new Date().getMonth() + 1) / 3);
  const y = new Date().getFullYear();

  const objs = [
    { ownerIdx: 0, level: 'COMPANY', title: 'Aumentar o NPS do restaurante para 65 pontos', description: 'Nosso objetivo é nos tornar referência em experiência do cliente na região', krs: [
      { title: 'NPS geral acima de 65', s: 42, c: 58, t: 65, m: 'NUMBER' },
      { title: 'Reduzir reclamações de atendimento em 40%', s: 35, c: 20, t: 21, m: 'NUMBER' },
      { title: 'Nota média no iFood acima de 4.7', s: 4.3, c: 4.55, t: 4.7, m: 'NUMBER' },
    ]},
    { ownerIdx: 1, level: 'TEAM', title: 'Reduzir tempo médio de preparo dos pratos', description: 'Otimizar fluxo da cozinha para atender melhor em horários de pico', krs: [
      { title: 'Tempo médio de saída abaixo de 18 minutos', s: 28, c: 22, t: 18, m: 'NUMBER' },
      { title: 'Zero pratos devolvidos por atraso', s: 12, c: 4, t: 0, m: 'NUMBER' },
      { title: 'Implementar mise en place padronizado em todas praças', s: 0, c: 1, t: 1, m: 'BOOLEAN' },
    ]},
    { ownerIdx: 2, level: 'TEAM', title: 'Aumentar ticket médio do salão em 15%', description: 'Trabalhar sugestão de entradas, sobremesas e bebidas', krs: [
      { title: 'Ticket médio acima de R$ 95', s: 82, c: 88, t: 95, m: 'NUMBER' },
      { title: 'Taxa de sobremesas vendidas acima de 45%', s: 28, c: 38, t: 45, m: 'PERCENTAGE' },
      { title: 'Treinamento de sugestão concluído por 100% do time', s: 0, c: 85, t: 100, m: 'PERCENTAGE' },
    ]},
    { ownerIdx: 3, level: 'TEAM', title: 'Reduzir desperdício de alimentos em 25%', description: 'Controle de estoque + porcionamento + aproveitamento de sobras', krs: [
      { title: 'Desperdício abaixo de R$ 4.500/mês', s: 6200, c: 5100, t: 4500, m: 'NUMBER' },
      { title: 'Sistema de CMV implementado', s: 0, c: 1, t: 1, m: 'BOOLEAN' },
      { title: 'Treinamento anti-desperdício realizado com cozinha', s: 0, c: 1, t: 1, m: 'BOOLEAN' },
    ]},
    { ownerIdx: 4, level: 'INDIVIDUAL', title: 'Preparar-me para assumir posição de Chef Titular', description: 'Plano de desenvolvimento para próxima promoção', krs: [
      { title: 'Concluir curso de Gestão de Cozinha Profissional', s: 0, c: 2, t: 3, m: 'NUMBER' },
      { title: 'Liderar 2 criações de cardápio sazonal', s: 0, c: 1, t: 2, m: 'NUMBER' },
      { title: 'Obter certificação de Boas Práticas (ANVISA)', s: 0, c: 0, t: 1, m: 'BOOLEAN' },
    ]},
    { ownerIdx: 12, level: 'INDIVIDUAL', title: 'Tornar-me Maître do segundo turno', description: 'Crescer para posição de liderança no salão', krs: [
      { title: 'Participar de todas as reuniões de gestão', s: 0, c: 6, t: 8, m: 'NUMBER' },
      { title: 'Liderar treinamentos de novos garçons', s: 0, c: 2, t: 4, m: 'NUMBER' },
      { title: 'Certificação em gestão de salão', s: 0, c: 0, t: 1, m: 'BOOLEAN' },
    ]},
    { ownerIdx: 21, level: 'TEAM', title: 'Atingir 40% de crescimento no delivery', description: 'Expandir operação de delivery com qualidade', krs: [
      { title: 'Pedidos diários acima de 120', s: 85, c: 105, t: 120, m: 'NUMBER' },
      { title: 'Tempo médio de entrega abaixo de 30 min', s: 42, c: 34, t: 30, m: 'NUMBER' },
      { title: 'Nota no iFood acima de 4.6', s: 4.2, c: 4.5, t: 4.6, m: 'NUMBER' },
    ]},
  ];

  for (const o of objs) {
    if (!u[o.ownerIdx]) continue;
    const obj = await prisma.objective.create({
      data: {
        companyId,
        ownerId: u[o.ownerIdx],
        title: o.title,
        description: o.description,
        level: o.level as 'COMPANY' | 'TEAM' | 'INDIVIDUAL',
        quarter: q,
        year: y,
        status: 'ON_TRACK',
      },
    });
    for (const kr of o.krs) {
      await prisma.keyResult.create({
        data: {
          objectiveId: obj.id,
          title: kr.title,
          startValue: kr.s,
          currentValue: kr.c,
          targetValue: kr.t,
          metricType: kr.m as 'NUMBER' | 'PERCENTAGE' | 'BOOLEAN' | 'CURRENCY',
        },
      });
    }
  }
}

// ============================================================
// Celebrations (Mural)
// ============================================================
async function seedCelebrations(companyId: string, u: string[]) {
  const cels = [
    { authorIdx: 0, type: 'ACHIEVEMENT', content: '🎉 Batemos recorde de faturamento no último sábado! R$ 48 mil em um único dia. Parabéns a toda equipe pela dedicação!' },
    { authorIdx: 1, type: 'ACHIEVEMENT', content: 'Nosso restaurante foi citado na matéria da Veja como um dos 10 melhores italianos da região! 🏆 Obrigado time!' },
    { authorIdx: 0, type: 'ANNIVERSARY', content: 'Hoje a @Fernanda Tanaka completa 2 anos e meio com a gente! Obrigada por toda sua dedicação, Fer. Você é parte fundamental do nosso sucesso! 🎂' },
    { authorIdx: 2, type: 'BIRTHDAY', content: 'Feliz aniversário, @Thiago Rocha! Que esse novo ciclo venha cheio de bons momentos, saúde e muitas gorjetas! 🎈🎂' },
    { authorIdx: 1, type: 'GENERAL', content: 'Cozinha bateu 100% dos OKRs do último trimestre! Sábado vamos ter uma confraternização no restaurante depois do fechamento. Todos convidados! 🍝🥂' },
    { authorIdx: 13, type: 'GENERAL', content: 'Hoje foi meu último dia como garçonete e vou ser promovida a chefe de fila! Obrigada ao @Eduardo Passos e à @Patrícia Moraes pela confiança. 💪' },
    { authorIdx: 8, type: 'ACHIEVEMENT', content: 'Minha sobremesa "Torta de Limão Siciliano" virou o prato mais vendido da semana! 30 unidades em 3 dias! 🍰' },
    { authorIdx: 21, type: 'GENERAL', content: 'Delivery fechou o mês com 3.200 pedidos entregues e 97% de notas 5 estrelas. Obrigado @Carlos Eduardo e @Júlia Martins! 🛵' },
    { authorIdx: 19, type: 'ACHIEVEMENT', content: 'Meu novo drink autoral "Primavera Tropical" foi aprovado pelo Chef e entra no cardápio na próxima semana! 🍹 Que responsabilidade!' },
    { authorIdx: 0, type: 'ANNIVERSARY', content: 'Hoje o @Rodrigo Bianchi completa 4 anos liderando nossa cozinha! Chef, você transformou nosso restaurante. Muito obrigada pela parceria de tantos anos. 👨‍🍳' },
  ];

  for (const c of cels) {
    if (!u[c.authorIdx]) continue;
    await prisma.celebration.create({
      data: {
        companyId,
        authorId: u[c.authorIdx],
        type: c.type as 'ACHIEVEMENT' | 'BIRTHDAY' | 'ANNIVERSARY' | 'GENERAL',
        content: c.content,
      },
    });
  }
}

// ============================================================
// Announcements
// ============================================================
async function seedAnnouncements(companyId: string, adminId: string) {
  if (!adminId) return;
  const anns = [
    { title: 'Novo cardápio de outono disponível', content: 'A partir de segunda-feira entra em vigor o novo cardápio de outono. Os pratos novos já estão nas provas de degustação. Toda a equipe do salão deve conhecer as novidades antes do serviço.' },
    { title: 'Treinamento obrigatório — NR-01 Riscos Psicossociais', content: 'Conforme exigência do Ministério do Trabalho, todos os colaboradores devem participar do treinamento sobre gestão de riscos psicossociais. Horários disponíveis nas próximas duas semanas. Procure sua liderança.' },
    { title: 'Campanha de vacinação contra gripe', content: 'A empresa oferecerá vacinação gratuita contra influenza na próxima quinta-feira, das 14h às 16h, no salão secundário. Recomendamos fortemente a participação de toda a equipe.' },
    { title: 'Reunião geral de fechamento do trimestre', content: 'Nossa reunião geral acontecerá no próximo domingo às 10h (antes da abertura). Vamos apresentar resultados, celebrar conquistas e anunciar o programa de bônus do próximo trimestre. Presença obrigatória.' },
  ];

  for (const a of anns) {
    await prisma.announcement.create({
      data: {
        companyId,
        authorId: adminId,
        title: a.title,
        content: a.content,
        targetDepartments: '[]',
        sentAt: new Date(),
      },
    });
  }
}

// ============================================================
// Gamification Points
// ============================================================
async function seedGamification(companyId: string, u: string[]) {
  for (const id of u) {
    if (!id) continue;
    const points = Math.floor(Math.random() * 400) + 80;
    await prisma.gamificationPoints.create({
      data: {
        companyId,
        userId: id,
        points,
        reason: 'Pontos acumulados no período',
        sourceType: 'DEMO_SEED',
      },
    });
  }
}

// ============================================================
// Mood Logs (último 7 dias, vários usuários)
// ============================================================
async function seedMoodLogs(companyId: string, u: string[]) {
  for (let i = 0; i < u.length; i++) {
    if (!u[i]) continue;
    // Cada user tem entre 3-7 moods nos últimos 7 dias
    const days = Math.floor(Math.random() * 5) + 3;
    for (let d = 0; d < days; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      date.setHours(0, 0, 0, 0);
      await prisma.moodLog.create({
        data: {
          companyId,
          userId: u[i],
          mood: randomMood(),
          date,
        },
      }).catch(() => {});
    }
  }
}

// ============================================================
// NR-01 — Avaliação Psicossocial + Inventário + Planos + Denúncias
// ============================================================
async function seedNr01(companyId: string, u: string[]) {
  if (!u[0]) return;

  // 1. Psychosocial Assessment ativa com perguntas específicas para restaurante
  const assessment = await prisma.psychosocialAssessment.create({
    data: {
      companyId,
      title: 'Avaliação de Riscos Psicossociais — 2026',
      description: 'Avaliação obrigatória conforme NR-01. Foco nos riscos específicos da operação de restaurante: pressão em horários de pico, ritmo intenso, contato com clientes.',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 7 * 86400000),
      endDate: new Date(Date.now() + 14 * 86400000),
      anonymous: true,
      createdById: u[0],
    },
  });

  const questions = [
    { text: 'Sinto-me sobrecarregado nos horários de pico (almoço e jantar)', category: 'Carga de trabalho' },
    { text: 'Tenho autonomia para tomar decisões no meu trabalho', category: 'Autonomia' },
    { text: 'A pressão por qualidade e rapidez é equilibrada', category: 'Carga de trabalho' },
    { text: 'Recebo apoio da liderança em situações difíceis com clientes', category: 'Suporte social' },
    { text: 'Meus horários permitem conciliar vida pessoal e trabalho', category: 'Equilíbrio trabalho-vida' },
    { text: 'Sinto-me reconhecido pelo meu trabalho', category: 'Reconhecimento' },
    { text: 'Sei a quem recorrer em caso de conflito com colegas', category: 'Relacionamento' },
    { text: 'Tenho canais seguros para reportar situações de assédio', category: 'Segurança' },
    { text: 'A comunicação entre cozinha e salão funciona bem', category: 'Comunicação' },
    { text: 'Sinto-me seguro(a) quanto à estabilidade do meu emprego', category: 'Segurança' },
    { text: 'Meu ritmo de trabalho permite pausas adequadas', category: 'Carga de trabalho' },
    { text: 'Recebo treinamentos suficientes para executar minhas funções', category: 'Desenvolvimento' },
  ];

  const createdQuestions: { id: string }[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = await prisma.psychosocialQuestion.create({
      data: {
        assessmentId: assessment.id,
        text: questions[i].text,
        category: questions[i].category,
        order: i,
      },
    });
    createdQuestions.push({ id: q.id });
  }

  // Algumas respostas já enviadas (anônimas)
  for (let i = 0; i < 8; i++) {
    const response = await prisma.psychosocialResponse.create({
      data: {
        assessmentId: assessment.id,
        userId: null, // anônimo
      },
    });
    for (const q of createdQuestions) {
      const scale = Math.floor(Math.random() * 5) + 1;
      await prisma.psychosocialAnswer.create({
        data: {
          responseId: response.id,
          questionId: q.id,
          value: String(scale),
        },
      });
    }
  }

  // 2. Inventário de Riscos com riscos identificados
  const inventory = await prisma.riskInventory.create({
    data: {
      companyId,
      title: 'Inventário de Riscos Psicossociais Q1/2026',
      description: 'Levantamento inicial dos riscos psicossociais mapeados no restaurante',
      referenceDate: new Date(),
      createdById: u[0],
    },
  });

  const risks = [
    { description: 'Sobrecarga de trabalho em horários de pico (almoço e jantar)', category: 'Carga de trabalho', severity: 'HIGH', affected: 'Cozinha e Salão', mitigation: 'Revisar escalas, adicionar apoio em horários críticos, garantir pausas obrigatórias' },
    { description: 'Pressão excessiva por rapidez comprometendo qualidade percebida', category: 'Carga de trabalho', severity: 'MEDIUM', affected: 'Cozinha', mitigation: 'Padronizar mise en place, treinamento em gestão de pressão' },
    { description: 'Contato com clientes insatisfeitos sem protocolo claro de apoio', category: 'Violência externa', severity: 'MEDIUM', affected: 'Salão', mitigation: 'Criar protocolo de escalonamento para o maître, treinamento de atendimento a reclamações' },
    { description: 'Horários irregulares dificultando conciliação vida pessoal', category: 'Organização do trabalho', severity: 'HIGH', affected: 'Toda equipe operacional', mitigation: 'Implementar banco de horas, planejamento de escalas com 15 dias de antecedência' },
    { description: 'Ausência de canal formal para reportar assédio', category: 'Assédio', severity: 'HIGH', affected: 'Toda empresa', mitigation: 'Criar canal de denúncias anônimo, treinamento anti-assédio obrigatório' },
  ];

  for (const r of risks) {
    const identified = await prisma.identifiedRisk.create({
      data: {
        inventoryId: inventory.id,
        description: r.description,
        category: r.category,
        severity: r.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        affectedArea: r.affected,
        mitigationPlan: r.mitigation,
      },
    });

    // Plano de ação para cada risco alto
    if (r.severity === 'HIGH') {
      await prisma.actionPlan.create({
        data: {
          riskId: identified.id,
          title: `Mitigação: ${r.description.substring(0, 40)}...`,
          description: r.mitigation,
          responsibleId: u[0],
          dueDate: new Date(Date.now() + 30 * 86400000),
          status: 'IN_PROGRESS',
        },
      });
    }
  }

  // 3. Denúncias de exemplo (canal de canal de comunicação)
  await prisma.complaint.create({
    data: {
      companyId,
      authorId: null,
      anonymous: true,
      category: 'Assédio moral',
      description: 'Tenho presenciado situações em que um colega de área usa tom agressivo com os auxiliares durante os horários de pico. Gostaria de registrar o fato para que a liderança possa atuar.',
      status: 'INVESTIGATING',
    },
  });

  await prisma.complaint.create({
    data: {
      companyId,
      authorId: null,
      anonymous: true,
      category: 'Condições de trabalho',
      description: 'O ar-condicionado da cozinha não está funcionando adequadamente, o que torna o ambiente muito quente durante o serviço. Isso afeta nosso desempenho e saúde.',
      status: 'OPEN',
    },
  });
}

// ============================================================
// Surveys (Clima, Pulso, Satisfação)
// ============================================================
async function seedSurveys(companyId: string) {
  // Pesquisa de Clima Ativa
  const survey = await prisma.survey.create({
    data: {
      companyId,
      title: 'Pesquisa de Clima — 1º Semestre 2026',
      type: 'CLIMATE',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 5 * 86400000),
      endDate: new Date(Date.now() + 10 * 86400000),
      anonymous: true,
    },
  });

  const climateQuestions = [
    { text: 'Recomendaria o Sabor & Arte como um bom lugar para trabalhar?', type: 'SCALE' },
    { text: 'Sinto orgulho de fazer parte dessa equipe', type: 'SCALE' },
    { text: 'Minha liderança direta me apoia no meu desenvolvimento', type: 'SCALE' },
    { text: 'O clima entre as equipes (cozinha, salão, bar) é saudável', type: 'SCALE' },
    { text: 'Recebo feedback regular sobre meu desempenho', type: 'SCALE' },
    { text: 'Qual aspecto do nosso ambiente você mais gostaria de melhorar?', type: 'TEXT' },
  ];

  for (let i = 0; i < climateQuestions.length; i++) {
    await prisma.surveyQuestion.create({
      data: {
        surveyId: survey.id,
        text: climateQuestions[i].text,
        type: climateQuestions[i].type as 'SCALE' | 'MULTIPLE_CHOICE' | 'TEXT',
        order: i,
      },
    });
  }

  // Pesquisa anterior finalizada
  await prisma.survey.create({
    data: {
      companyId,
      title: 'Pulse Check — Dezembro 2025',
      type: 'PULSE',
      status: 'CLOSED',
      startDate: new Date(Date.now() - 90 * 86400000),
      endDate: new Date(Date.now() - 60 * 86400000),
      anonymous: true,
    },
  });
}

// ============================================================
// eNPS
// ============================================================
async function seedEnps(companyId: string, u: string[]) {
  if (!u[0]) return;
  const enps = await prisma.enpsSurvey.create({
    data: {
      companyId,
      title: 'eNPS Trimestral — Q1/2026',
      status: 'CLOSED',
      startDate: new Date(Date.now() - 45 * 86400000),
      endDate: new Date(Date.now() - 30 * 86400000),
      createdById: u[0],
    },
  });

  // Respostas: mix de promotores, neutros, detratores
  const scores = [9, 10, 8, 7, 9, 10, 6, 8, 9, 7, 10, 5, 8, 9, 10, 7, 8, 6];
  for (const s of scores) {
    await prisma.enpsResponse.create({
      data: {
        surveyId: enps.id,
        userId: null,
        score: s,
        comment: s >= 9 ? 'Ambiente muito bom!' : s >= 7 ? 'Tem melhorado bastante' : 'Poderia melhorar a comunicação',
      },
    });
  }
}

// ============================================================
// DISC
// ============================================================
async function seedDisc(companyId: string, u: string[]) {
  const profiles = [
    { idx: 0, d: 75, i: 60, s: 45, c: 70, primary: 'D' }, // Patrícia — líder decisiva
    { idx: 1, d: 85, i: 45, s: 30, c: 65, primary: 'D' }, // Chef Rodrigo
    { idx: 2, d: 40, i: 80, s: 65, c: 35, primary: 'I' }, // Maître Eduardo
    { idx: 4, d: 55, i: 50, s: 70, c: 60, primary: 'S' }, // Fernanda Sous-chef
    { idx: 12, d: 30, i: 75, s: 80, c: 35, primary: 'S' }, // Thiago garçom sênior
  ];

  for (const p of profiles) {
    if (!u[p.idx]) continue;
    await prisma.discAssessment.create({
      data: {
        companyId,
        userId: u[p.idx],
        profileD: p.d,
        profileI: p.i,
        profileS: p.s,
        profileC: p.c,
        primaryProfile: p.primary as 'D' | 'I' | 'S' | 'C',
        completedAt: new Date(Date.now() - 20 * 86400000),
      },
    });
  }
}

// ============================================================
// Review Cycles
// ============================================================
async function seedReviews(companyId: string, u: string[]) {
  // Ciclo ativo 90 dias
  const cycle = await prisma.reviewCycle.create({
    data: {
      companyId,
      name: 'Avaliação de Desempenho — Q1/2026',
      type: 'HALF',
      startDate: new Date(Date.now() - 10 * 86400000),
      endDate: new Date(Date.now() + 20 * 86400000),
      status: 'ACTIVE',
    },
  });

  const criteria = [
    { name: 'Qualidade técnica do trabalho', description: 'Executa funções com excelência técnica e atenção aos detalhes', weight: 2.0 },
    { name: 'Colaboração e trabalho em equipe', description: 'Contribui para um ambiente colaborativo e ajuda colegas', weight: 1.5 },
    { name: 'Atendimento ao cliente', description: 'Demonstra empatia e profissionalismo ao lidar com clientes', weight: 2.0 },
    { name: 'Pontualidade e presença', description: 'Cumpre horários e escalas com consistência', weight: 1.0 },
    { name: 'Iniciativa e proatividade', description: 'Identifica oportunidades de melhoria e age sem esperar ordens', weight: 1.5 },
  ];

  const criteriaIds: string[] = [];
  for (const c of criteria) {
    const cr = await prisma.reviewCriteria.create({
      data: {
        cycleId: cycle.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
      },
    });
    criteriaIds.push(cr.id);
  }

  // Assignments: managers avaliando seus subordinados
  const assignPairs = [
    { evaluator: 1, evaluatee: 4 }, // Rodrigo → Fernanda
    { evaluator: 1, evaluatee: 5 }, // Rodrigo → Matheus
    { evaluator: 1, evaluatee: 6 }, // Rodrigo → Giovanna
    { evaluator: 2, evaluatee: 12 }, // Eduardo → Thiago
    { evaluator: 2, evaluatee: 13 }, // Eduardo → Larissa
    { evaluator: 2, evaluatee: 14 }, // Eduardo → Bruno
    { evaluator: 3, evaluatee: 19 }, // Débora → Leonardo
    { evaluator: 3, evaluatee: 21 }, // Débora → Alexandre
  ];

  for (const p of assignPairs) {
    if (!u[p.evaluator] || !u[p.evaluatee]) continue;
    const assignment = await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        evaluatorId: u[p.evaluator],
        evaluateeId: u[p.evaluatee],
        status: Math.random() > 0.5 ? 'DONE' : 'PENDING',
      },
    });

    // Metade das avaliações já com respostas
    if (assignment.status === 'DONE') {
      for (const critId of criteriaIds) {
        await prisma.reviewAnswer.create({
          data: {
            assignmentId: assignment.id,
            criteriaId: critId,
            score: Math.floor(Math.random() * 3) + 3, // 3-5
            comment: 'Desempenho consistente e acima da média.',
          },
        });
      }
    }
  }
}

// ============================================================
// PDI
// ============================================================
async function seedPdi(companyId: string, u: string[]) {
  const plans = [
    { userIdx: 4, createdByIdx: 1, title: 'Desenvolvimento para Chef Titular', tasks: [
      { title: 'Concluir curso de Gestão de Cozinha', type: 'COURSE', status: 'IN_PROGRESS' },
      { title: 'Ler "The Professional Chef" (CIA)', type: 'BOOK', status: 'COMPLETED' },
      { title: 'Participar como jurada em festival gastronômico', type: 'PRACTICE', status: 'PENDING' },
    ]},
    { userIdx: 13, createdByIdx: 2, title: 'Plano de crescimento para Maître', tasks: [
      { title: 'Treinamento de gestão de equipes', type: 'COURSE', status: 'COMPLETED' },
      { title: 'Acompanhar rotina do maître por 2 semanas', type: 'MENTORING', status: 'IN_PROGRESS' },
      { title: 'Assumir fechamento do caixa 2x por semana', type: 'PRACTICE', status: 'PENDING' },
    ]},
    { userIdx: 16, createdByIdx: 2, title: 'Evolução de Commis para Garçonete', tasks: [
      { title: 'Aprender todo o cardápio e harmonizações', type: 'BOOK', status: 'IN_PROGRESS' },
      { title: 'Treinamento de atendimento sênior', type: 'COURSE', status: 'PENDING' },
    ]},
  ];

  for (const p of plans) {
    if (!u[p.userIdx] || !u[p.createdByIdx]) continue;
    const plan = await prisma.developmentPlan.create({
      data: {
        companyId,
        userId: u[p.userIdx],
        createdById: u[p.createdByIdx],
        title: p.title,
        description: 'Plano de desenvolvimento individual criado em conjunto com a liderança',
        status: 'ACTIVE',
        dueDate: new Date(Date.now() + 90 * 86400000),
      },
    });

    for (let i = 0; i < p.tasks.length; i++) {
      const t = p.tasks[i];
      await prisma.developmentTask.create({
        data: {
          planId: plan.id,
          title: t.title,
          type: t.type as 'COURSE' | 'BOOK' | 'MENTORING' | 'PRACTICE' | 'OTHER',
          status: t.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
          completedAt: t.status === 'COMPLETED' ? new Date() : null,
          order: i,
        },
      });
    }
  }
}

// ============================================================
// 1:1 Cycles + Meetings
// ============================================================
async function seedOneOnOne(companyId: string, u: string[]) {
  const cycles = [
    { managerIdx: 1, employeeIdx: 4 }, // Chef → Fernanda
    { managerIdx: 1, employeeIdx: 5 }, // Chef → Matheus
    { managerIdx: 2, employeeIdx: 12 }, // Maître → Thiago
    { managerIdx: 2, employeeIdx: 13 }, // Maître → Larissa
    { managerIdx: 0, employeeIdx: 1 }, // Gerente → Chef
  ];

  for (const c of cycles) {
    if (!u[c.managerIdx] || !u[c.employeeIdx]) continue;
    const cycle = await prisma.oneOnOneCycle.create({
      data: {
        companyId,
        managerId: u[c.managerIdx],
        employeeId: u[c.employeeIdx],
        frequency: 'BIWEEKLY',
        dayOfWeek: 1,
        active: true,
      },
    });

    // Última reunião realizada
    await prisma.oneOnOneMeeting.create({
      data: {
        cycleId: cycle.id,
        scheduledAt: new Date(Date.now() - 14 * 86400000),
        status: 'COMPLETED',
        managerNotes: 'Conversa produtiva sobre rotina e desafios. Alinhamos expectativas para o próximo ciclo.',
        employeeNotes: 'Senti que pude falar abertamente sobre o que está me preocupando.',
        actionItems: '1. Revisar escala de fim de semana\n2. Agendar treinamento de novos pratos\n3. Próxima reunião em 2 semanas',
        completedAt: new Date(Date.now() - 14 * 86400000),
      },
    });

    // Próxima reunião agendada
    await prisma.oneOnOneMeeting.create({
      data: {
        cycleId: cycle.id,
        scheduledAt: new Date(Date.now() + 3 * 86400000),
        status: 'SCHEDULED',
      },
    });
  }
}

// ============================================================
// Onboarding
// ============================================================
async function seedOnboarding(companyId: string, u: string[]) {
  // Template para novos funcionários de restaurante
  const template = await prisma.onboardingTemplate.create({
    data: {
      companyId,
      name: 'Onboarding Geral — Novo Colaborador',
      description: 'Processo de integração padrão para todos os novos membros da equipe do Sabor & Arte',
      durationDays: 90,
    },
  });

  const tasks = [
    { title: 'Receber uniforme e materiais de EPI', type: 'DOCUMENT', dueDay: 1, assignedTo: 'HR' },
    { title: 'Leitura e assinatura do manual de boas práticas (ANVISA)', type: 'DOCUMENT', dueDay: 2, assignedTo: 'EMPLOYEE' },
    { title: 'Treinamento de segurança no trabalho (NR-35, NR-12)', type: 'TRAINING', dueDay: 3, assignedTo: 'EMPLOYEE' },
    { title: 'Tour pelas áreas do restaurante e apresentação à equipe', type: 'MEETING', dueDay: 1, assignedTo: 'MANAGER' },
    { title: 'Treinamento de manipulação de alimentos', type: 'TRAINING', dueDay: 7, assignedTo: 'EMPLOYEE' },
    { title: 'Conhecer todo o cardápio (descrição, ingredientes, alergênicos)', type: 'OTHER', dueDay: 14, assignedTo: 'EMPLOYEE' },
    { title: 'Shadowing com colaborador experiente por 3 dias', type: 'MEETING', dueDay: 21, assignedTo: 'EMPLOYEE' },
    { title: '1:1 de check-in com liderança (15 dias)', type: 'MEETING', dueDay: 15, assignedTo: 'MANAGER' },
    { title: '1:1 de check-in com liderança (30 dias)', type: 'MEETING', dueDay: 30, assignedTo: 'MANAGER' },
    { title: 'Avaliação de experiência (60 dias)', type: 'MEETING', dueDay: 60, assignedTo: 'MANAGER' },
    { title: 'Avaliação final de integração (90 dias)', type: 'MEETING', dueDay: 90, assignedTo: 'MANAGER' },
  ];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    await prisma.onboardingTemplateTask.create({
      data: {
        templateId: template.id,
        title: t.title,
        type: t.type as 'DOCUMENT' | 'TRAINING' | 'MEETING' | 'SYSTEM_ACCESS' | 'OTHER',
        dueDay: t.dueDay,
        assignedTo: t.assignedTo as 'HR' | 'MANAGER' | 'EMPLOYEE',
        order: i,
      },
    });
  }

  // Processo ativo para colaboradora recém-chegada (Maria Eduarda)
  if (u[10]) {
    const process = await prisma.onboardingProcess.create({
      data: {
        companyId,
        userId: u[10],
        templateId: template.id,
        startDate: new Date(Date.now() - 45 * 86400000),
        status: 'ACTIVE',
      },
    });

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const dueDate = new Date(Date.now() - 45 * 86400000);
      dueDate.setDate(dueDate.getDate() + t.dueDay);
      const isPast = dueDate < new Date();
      await prisma.onboardingProcessTask.create({
        data: {
          processId: process.id,
          title: t.title,
          type: t.type as 'DOCUMENT' | 'TRAINING' | 'MEETING' | 'SYSTEM_ACCESS' | 'OTHER',
          dueDate,
          assignedTo: t.assignedTo as 'HR' | 'MANAGER' | 'EMPLOYEE',
          status: isPast ? 'COMPLETED' : 'PENDING',
          completedAt: isPast ? dueDate : null,
        },
      });
    }
  }
}

// ============================================================
// Learning Tracks
// ============================================================
async function seedTracks(companyId: string, u: string[]) {
  if (!u[0]) return;

  const tracks = [
    {
      title: 'Boas Práticas de Manipulação de Alimentos',
      description: 'Tudo o que você precisa saber sobre higiene, segurança alimentar e conformidade com ANVISA',
      category: 'Obrigatório',
      hours: 4,
      contents: [
        { title: 'Introdução às boas práticas', type: 'VIDEO', duration: 15 },
        { title: 'Higiene pessoal e de utensílios', type: 'VIDEO', duration: 20 },
        { title: 'Controle de temperatura', type: 'ARTICLE', duration: 15 },
        { title: 'Prevenção de contaminação cruzada', type: 'VIDEO', duration: 25 },
        { title: 'Avaliação final', type: 'OTHER', duration: 15 },
      ],
    },
    {
      title: 'Atendimento ao Cliente Excepcional',
      description: 'Técnicas avançadas de atendimento, abordagem, sugestão de pratos e gestão de reclamações',
      category: 'Salão',
      hours: 3,
      contents: [
        { title: 'A experiência do cliente no restaurante', type: 'VIDEO', duration: 20 },
        { title: 'Abordagem e leitura de expectativas', type: 'VIDEO', duration: 25 },
        { title: 'Sugestão e harmonização', type: 'ARTICLE', duration: 20 },
        { title: 'Lidando com clientes insatisfeitos', type: 'VIDEO', duration: 30 },
      ],
    },
    {
      title: 'Gestão de Conflitos em Alta Pressão',
      description: 'Como manter o equilíbrio emocional e resolver conflitos nos horários de pico',
      category: 'Liderança',
      hours: 2,
      contents: [
        { title: 'Fundamentos de inteligência emocional', type: 'VIDEO', duration: 30 },
        { title: 'Técnicas de respiração e foco', type: 'ARTICLE', duration: 15 },
        { title: 'Resolução de conflitos entre áreas', type: 'VIDEO', duration: 25 },
      ],
    },
  ];

  for (const t of tracks) {
    const track = await prisma.learningTrack.create({
      data: {
        companyId,
        title: t.title,
        description: t.description,
        category: t.category,
        estimatedHours: t.hours,
        status: 'PUBLISHED',
        createdById: u[0],
      },
    });

    for (let i = 0; i < t.contents.length; i++) {
      const c = t.contents[i];
      await prisma.learningContent.create({
        data: {
          trackId: track.id,
          title: c.title,
          type: c.type as 'VIDEO' | 'ARTICLE' | 'COURSE' | 'PODCAST' | 'BOOK' | 'OTHER',
          durationMinutes: c.duration,
          order: i,
          required: true,
        },
      });
    }

    // Enrollments: alguns colaboradores inscritos
    const enrollIndices = [4, 5, 12, 13, 16, 10];
    for (const idx of enrollIndices) {
      if (!u[idx]) continue;
      await prisma.trackEnrollment.create({
        data: {
          trackId: track.id,
          userId: u[idx],
          status: Math.random() > 0.5 ? 'ACTIVE' : 'COMPLETED',
          completedAt: Math.random() > 0.5 ? new Date(Date.now() - 10 * 86400000) : null,
        },
      });
    }
  }
}

// ============================================================
// Recrutamento (Vagas + Candidatos)
// ============================================================
async function seedRecruitment(companyId: string, adminId: string) {
  if (!adminId) return;

  const positionsData = [
    {
      title: 'Cozinheiro de Chapa', location: 'São Paulo - SP', salaryMin: 2200, salaryMax: 2800, vacancies: 1,
      description: 'Buscamos cozinheiro experiente para a praça da chapa. Requisitos: experiência mínima de 2 anos, curso de boas práticas, disponibilidade para finais de semana.',
      candidates: [
        { name: 'Ricardo Alves', email: 'ricardo.alves@candidatos-demo.com', phone: '(11) 98765-4321' },
        { name: 'Sandra Moreira', email: 'sandra.moreira@candidatos-demo.com', phone: '(11) 91234-5678' },
        { name: 'Marcos Vinícius', email: 'marcos.v@candidatos-demo.com', phone: '(11) 99876-5432' },
      ],
    },
    {
      title: 'Garçom(ete)', location: 'São Paulo - SP', salaryMin: 1800, salaryMax: 2400, vacancies: 2,
      description: 'Vagas para garçom(ete) com perfil comunicativo e atencioso. Experiência em restaurantes à la carte é diferencial.',
      candidates: [
        { name: 'Juliana Paiva', email: 'juliana.paiva@candidatos-demo.com', phone: '(11) 95432-1234' },
        { name: 'Felipe Monteiro', email: 'felipe.monteiro@candidatos-demo.com', phone: '(11) 94321-9876' },
        { name: 'Vanessa Souza', email: 'vanessa.souza@candidatos-demo.com', phone: '(11) 93210-8765' },
      ],
    },
    {
      title: 'Motoboy / Entregador', location: 'São Paulo - SP', salaryMin: 1500, salaryMax: 1800, vacancies: 1,
      description: 'Entregador com moto própria, CNH categoria A, conhecimento da região. Bônus por entregas.',
      candidates: [
        { name: 'Anderson Silva', email: 'anderson.silva@candidatos-demo.com', phone: '(11) 92109-7654' },
        { name: 'Rogério Pinto', email: 'rogerio.pinto@candidatos-demo.com', phone: '(11) 91098-6543' },
      ],
    },
  ];

  for (const p of positionsData) {
    const pos = await prisma.jobPosition.create({
      data: {
        companyId,
        title: p.title,
        description: p.description,
        location: p.location,
        type: 'CLT',
        salaryMin: p.salaryMin,
        salaryMax: p.salaryMax,
        vacancies: p.vacancies,
        status: 'OPEN',
        createdById: adminId,
      },
    });

    for (const c of p.candidates) {
      const cand = await prisma.candidate.create({
        data: {
          companyId,
          name: c.name,
          email: c.email,
          phone: c.phone,
        },
      });

      await prisma.application.create({
        data: {
          positionId: pos.id,
          candidateId: cand.id,
          status: ['NEW', 'SCREENING', 'INTERVIEW'][Math.floor(Math.random() * 3)] as 'NEW' | 'SCREENING' | 'INTERVIEW',
        },
      });
    }
  }
}

// ============================================================
// Notifications
// ============================================================
async function seedNotifications(companyId: string, u: string[]) {
  const notifs = [
    { userIdx: 0, type: 'ANNOUNCEMENT_NEW', title: 'Novo comunicado', body: 'Novo cardápio de outono disponível' },
    { userIdx: 1, type: 'EVALUATION_PENDING', title: 'Avaliações pendentes', body: 'Você tem 3 avaliações pendentes no ciclo Q1/2026' },
    { userIdx: 4, type: 'FEEDBACK_RECEIVED', title: 'Novo feedback recebido', body: 'Rodrigo Bianchi enviou um elogio para você' },
    { userIdx: 12, type: 'SURVEY_ACTIVE', title: 'Pesquisa de clima ativa', body: 'Participe da Pesquisa de Clima 2026' },
    { userIdx: 13, type: 'FEEDBACK_RECEIVED', title: 'Novo feedback recebido', body: 'Eduardo Passos enviou um feedback para você' },
  ];

  for (const n of notifs) {
    if (!u[n.userIdx]) continue;
    await prisma.notification.create({
      data: {
        companyId,
        userId: u[n.userIdx],
        type: n.type as 'FEEDBACK_RECEIVED' | 'EVALUATION_PENDING' | 'ANNOUNCEMENT_NEW' | 'SURVEY_ACTIVE' | 'GENERAL',
        title: n.title,
        body: n.body,
        read: false,
      },
    });
  }
}

// ============================================================
// Cleanup
// ============================================================
export async function cleanupDemoCompany() {
  const supabase = getSupabaseAdmin();

  // Also clean up orphaned Supabase Auth users with demo email domains
  // (from previous failed seeds)
  try {
    let page = 1;
    while (true) {
      const { data: authList } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (!authList?.users || authList.users.length === 0) break;

      const orphans = authList.users.filter(u =>
        u.email?.endsWith('@saborarte-demo.com') ||
        u.email?.endsWith('@feedflow-demo.com'),
      );

      for (const orphan of orphans) {
        await supabase.auth.admin.deleteUser(orphan.id).catch(() => {});
      }

      if (authList.users.length < 1000) break;
      page++;
    }
  } catch (err) {
    console.error('[Demo Cleanup] Orphan cleanup error:', err);
  }

  const companies = await prisma.company.findMany({
    where: { name: DEMO_COMPANY_NAME },
    include: { users: true },
  });

  for (const company of companies) {
    for (const user of company.users) {
      if (user.authId) {
        await supabase.auth.admin.deleteUser(user.authId).catch(() => {});
      }
    }

    await prisma.$transaction(async (tx) => {
      const userIds = company.users.map(u => u.id);

      // Delete in safe order (children before parents)
      await tx.psychosocialAnswer.deleteMany({ where: { response: { assessment: { companyId: company.id } } } }).catch(() => {});
      await tx.psychosocialResponse.deleteMany({ where: { assessment: { companyId: company.id } } }).catch(() => {});
      await tx.psychosocialQuestion.deleteMany({ where: { assessment: { companyId: company.id } } }).catch(() => {});
      await tx.psychosocialAssessment.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.actionPlan.deleteMany({ where: { risk: { inventory: { companyId: company.id } } } }).catch(() => {});
      await tx.identifiedRisk.deleteMany({ where: { inventory: { companyId: company.id } } }).catch(() => {});
      await tx.riskInventory.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.complaint.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.surveyAnswer.deleteMany({ where: { response: { survey: { companyId: company.id } } } }).catch(() => {});
      await tx.surveyResponse.deleteMany({ where: { survey: { companyId: company.id } } }).catch(() => {});
      await tx.surveyQuestion.deleteMany({ where: { survey: { companyId: company.id } } }).catch(() => {});
      await tx.survey.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.enpsResponse.deleteMany({ where: { survey: { companyId: company.id } } }).catch(() => {});
      await tx.enpsSurvey.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.discAssessment.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.reviewAnswer.deleteMany({ where: { assignment: { cycle: { companyId: company.id } } } }).catch(() => {});
      await tx.reviewAssignment.deleteMany({ where: { cycle: { companyId: company.id } } }).catch(() => {});
      await tx.reviewCriteria.deleteMany({ where: { cycle: { companyId: company.id } } }).catch(() => {});
      await tx.reviewCycle.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.developmentTask.deleteMany({ where: { plan: { companyId: company.id } } }).catch(() => {});
      await tx.developmentPlan.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.oneOnOneTopic.deleteMany({ where: { meeting: { cycle: { companyId: company.id } } } }).catch(() => {});
      await tx.oneOnOneMeeting.deleteMany({ where: { cycle: { companyId: company.id } } }).catch(() => {});
      await tx.oneOnOneCycle.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.onboardingProcessTask.deleteMany({ where: { process: { companyId: company.id } } }).catch(() => {});
      await tx.onboardingProcess.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.onboardingTemplateTask.deleteMany({ where: { template: { companyId: company.id } } }).catch(() => {});
      await tx.onboardingTemplate.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.trackEnrollment.deleteMany({ where: { track: { companyId: company.id } } }).catch(() => {});
      await tx.learningContent.deleteMany({ where: { track: { companyId: company.id } } }).catch(() => {});
      await tx.learningTrack.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.application.deleteMany({ where: { position: { companyId: company.id } } }).catch(() => {});
      await tx.candidate.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.jobPosition.deleteMany({ where: { companyId: company.id } }).catch(() => {});

      await tx.gamificationPoints.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.celebration.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.announcement.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.feedback.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.keyResult.deleteMany({ where: { objective: { companyId: company.id } } }).catch(() => {});
      await tx.objective.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.moodLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await tx.notification.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.user.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.department.deleteMany({ where: { companyId: company.id } }).catch(() => {});
      await tx.company.delete({ where: { id: company.id } });
    }).catch((err) => {
      console.error('[Demo Cleanup] Error:', err);
    });
  }
}
