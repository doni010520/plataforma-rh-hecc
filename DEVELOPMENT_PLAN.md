# Development Plan — Plataforma de Gestão de Pessoas (tipo Feedz)

## Project Purpose and Goals

Construir uma plataforma SaaS multi-tenant de gestão de pessoas inspirada na Feedz, cobrindo o ciclo completo do colaborador: avaliação de desempenho, feedback contínuo, OKRs, pesquisa de clima, termômetro de humor e mural de celebrações. A aplicação deve ser multi-empresa (cada empresa é um tenant isolado), com três perfis de acesso: Administrador RH, Gestor e Colaborador.

## Context and Background

- Stack: Next.js 14+ (App Router), Tailwind CSS, PostgreSQL via Supabase, Supabase Auth, Prisma ORM
- Modelo de negócio: SaaS multi-tenant — cada empresa cadastrada tem seus próprios dados isolados por `company_id`
- Deploy alvo: Vercel (frontend/API) + Supabase (banco e auth)
- Idioma da interface: Português Brasileiro
- Não usar bibliotecas de UI prontas (shadcn, MUI etc.) — componentes próprios com Tailwind
- Não adicionar código placeholder ou TODO — cada fase deve ser funcional ao final
- Prioridade: MVP funcional antes de features avançadas

---

## Development Tasks

### Phase 1: Fundação do Projecto — Setup e Autenticação Multi-tenant

- [ ] Inicializar projecto Next.js 14 com App Router e Tailwind CSS
  - [ ] Configurar `tsconfig.json`, `eslint`, `prettier`
  - [ ] Criar estrutura de pastas: `app/`, `components/`, `lib/`, `prisma/`
- [ ] Configurar Supabase
  - [ ] Criar projecto no Supabase e obter `SUPABASE_URL` e `SUPABASE_ANON_KEY`
  - [ ] Configurar variáveis de ambiente em `.env.local`
  - [ ] Instalar `@supabase/supabase-js` e `@supabase/ssr`
- [ ] Configurar Prisma com PostgreSQL (Supabase)
  - [ ] Instalar Prisma e inicializar `schema.prisma`
  - [ ] Definir modelo `Company` (tenant): `id`, `name`, `slug`, `logo_url`, `created_at`
  - [ ] Definir modelo `User`: `id`, `company_id`, `email`, `name`, `role` (ADMIN | MANAGER | EMPLOYEE), `department`, `job_title`, `avatar_url`, `created_at`
  - [ ] Rodar `prisma migrate dev`
- [ ] Implementar autenticação com Supabase Auth
  - [ ] Página de login (`/login`) com email + senha
  - [ ] Middleware Next.js para proteger rotas autenticadas
  - [ ] Lógica de redireccionar para `/dashboard` após login
  - [ ] Logout funcional
- [ ] Criar fluxo de onboarding de nova empresa
  - [ ] Página `/register` — cadastro da empresa + primeiro utilizador (ADMIN)
  - [ ] Criar registo em `Company` e `User` ao mesmo tempo
- [ ] Layout base autenticado
  - [ ] Sidebar com navegação por módulo (ícones + labels)
  - [ ] Header com nome do utilizador, avatar e botão logout
  - [ ] Componente de loading/skeleton reutilizável
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 2: Gestão de Utilizadores e Estrutura Organizacional

- [ ] CRUD de Colaboradores (acesso: ADMIN)
  - [ ] Listagem paginada de colaboradores com filtro por departamento e cargo
  - [ ] Formulário de criação: nome, email, cargo, departamento, gestor directo, role
  - [ ] Envio de convite por email via Supabase Auth (`inviteUserByEmail`)
  - [ ] Edição e desactivação de colaborador (soft delete: campo `active`)
- [ ] Gestão de Departamentos
  - [ ] Modelo `Department`: `id`, `company_id`, `name`
  - [ ] CRUD de departamentos na interface de admin
- [ ] Perfil do Colaborador
  - [ ] Página `/profile` — edição de nome, avatar (upload para Supabase Storage), cargo
  - [ ] Visualização de histórico: feedbacks recebidos, avaliações, OKRs (resumo)
- [ ] Hierarquia gestor → liderado
  - [ ] Campo `manager_id` em `User` (self-referência)
  - [ ] Na listagem de colaboradores, gestor vê apenas os seus liderados
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 3: Avaliação de Desempenho

- [ ] Modelagem no banco
  - [ ] `ReviewCycle`: `id`, `company_id`, `name`, `type` (SELF | 180 | 360), `start_date`, `end_date`, `status` (DRAFT | ACTIVE | CLOSED)
  - [ ] `ReviewCriteria`: `id`, `cycle_id`, `name`, `description`, `weight`
  - [ ] `ReviewAssignment`: `id`, `cycle_id`, `evaluator_id`, `evaluatee_id`, `status` (PENDING | DONE)
  - [ ] `ReviewAnswer`: `id`, `assignment_id`, `criteria_id`, `score` (1–5), `comment`
- [ ] Interface ADMIN — configuração de ciclo
  - [ ] Criar ciclo: nome, tipo, período, critérios com peso
  - [ ] Seleccionar participantes (todos ou por departamento)
  - [ ] Activar ciclo (status → ACTIVE) e encerrar (status → CLOSED)
- [ ] Interface COLABORADOR — responder avaliação
  - [ ] Listagem de avaliações pendentes no dashboard
  - [ ] Formulário de avaliação: critério por critério, nota 1–5 + comentário
  - [ ] Salvar rascunho e submeter
- [ ] Interface GESTOR — acompanhamento
  - [ ] Ver status de preenchimento da equipa (quem respondeu, quem está pendente)
  - [ ] Visualizar respostas dos liderados após encerramento do ciclo
- [ ] Resultados e relatórios
  - [ ] Relatório 9Box: eixo X = desempenho, eixo Y = potencial (calculado por média de critérios configurados)
  - [ ] Mapa de calor por departamento
  - [ ] Exportação dos resultados em CSV
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 4: Feedback Contínuo

- [ ] Modelagem no banco
  - [ ] `Feedback`: `id`, `company_id`, `from_user_id`, `to_user_id`, `type` (PRAISE | CONSTRUCTIVE | REQUEST), `content`, `visibility` (PUBLIC | PRIVATE), `created_at`
- [ ] Interface — enviar feedback
  - [ ] Formulário: seleccionar destinatário, tipo, conteúdo (mín. 20 chars), visibilidade
  - [ ] Notificação in-app ao destinatário
- [ ] Interface — receber feedbacks
  - [ ] Feed de feedbacks recebidos com filtro por tipo e período
  - [ ] Feedbacks públicos visíveis para o gestor directo
- [ ] Histórico de feedbacks no perfil do colaborador
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 5: OKR — Gestão de Metas e Objectivos

- [ ] Modelagem no banco
  - [ ] `Objective`: `id`, `company_id`, `owner_id`, `title`, `description`, `level` (COMPANY | TEAM | INDIVIDUAL), `quarter`, `year`, `status` (ON_TRACK | AT_RISK | ACHIEVED | CANCELLED)
  - [ ] `KeyResult`: `id`, `objective_id`, `title`, `metric_type` (NUMBER | PERCENTAGE | CURRENCY | BOOLEAN), `start_value`, `target_value`, `current_value`, `confidence` (1–10), `updated_at`
  - [ ] `KeyResultUpdate`: `id`, `key_result_id`, `user_id`, `value`, `note`, `created_at`
- [ ] Interface ADMIN — OKRs da empresa
  - [ ] Criar objectivos estratégicos da empresa
  - [ ] Visualizar árvore de OKRs (empresa → equipa → individual)
- [ ] Interface GESTOR — OKRs da equipa
  - [ ] Criar objectivos de equipa vinculados a objectivos da empresa
  - [ ] Aprovar/reprovar OKRs de liderados
- [ ] Interface COLABORADOR — OKRs individuais
  - [ ] Criar objectivos individuais
  - [ ] Fazer check-in de progresso: actualizar `current_value` + nota de confiança + comentário
  - [ ] Histórico de check-ins por key result
- [ ] Dashboard OKR
  - [ ] Progresso global da empresa em percentagem
  - [ ] Lista de objectivos com barra de progresso por key result
  - [ ] Alerta visual para OKRs em risco
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 6: Pesquisa de Clima + Termômetro de Humor

- [ ] Modelagem no banco
  - [ ] `Survey`: `id`, `company_id`, `title`, `type` (CLIMATE | PULSE | SATISFACTION | CUSTOM), `status` (DRAFT | ACTIVE | CLOSED), `start_date`, `end_date`, `anonymous` (boolean)
  - [ ] `SurveyQuestion`: `id`, `survey_id`, `text`, `type` (SCALE | MULTIPLE_CHOICE | TEXT), `options` (JSON), `order`
  - [ ] `SurveyResponse`: `id`, `survey_id`, `user_id` (null se anónima), `submitted_at`
  - [ ] `SurveyAnswer`: `id`, `response_id`, `question_id`, `value`
  - [ ] `MoodLog`: `id`, `company_id`, `user_id`, `mood` (1–5), `date`, `note`
- [ ] Interface ADMIN — criar e gerir pesquisas
  - [ ] Criar pesquisa: título, tipo, período, anonimato, perguntas (arrastar para reordenar)
  - [ ] Banco de perguntas prontas (mínimo 20 perguntas pré-cadastradas)
  - [ ] Activar pesquisa e fechar manualmente ou por data
- [ ] Interface COLABORADOR — responder pesquisa
  - [ ] Banner de pesquisa activa no dashboard
  - [ ] Formulário de resposta passo a passo (uma pergunta por vez)
- [ ] Termômetro de Humor
  - [ ] Widget diário no dashboard: "Como você está hoje?" — 5 níveis com emoji
  - [ ] Registo de um humor por dia por colaborador
- [ ] Relatórios de pesquisa (ADMIN e GESTOR)
  - [ ] Taxa de resposta por departamento
  - [ ] Gráficos de resultados por pergunta
  - [ ] Evolução do humor médio da empresa por semana
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 7: Mural de Celebrações e Comunicados

- [ ] Modelagem no banco
  - [ ] `Celebration`: `id`, `company_id`, `author_id`, `content`, `type` (ACHIEVEMENT | BIRTHDAY | ANNIVERSARY | GENERAL), `created_at`
  - [ ] `CelebrationReaction`: `id`, `celebration_id`, `user_id`, `emoji`
  - [ ] `CelebrationComment`: `id`, `celebration_id`, `user_id`, `content`, `created_at`
  - [ ] `Announcement`: `id`, `company_id`, `author_id`, `title`, `content`, `target_departments` (JSON array), `scheduled_at`, `sent_at`
- [ ] Interface — Mural de Celebrações
  - [ ] Feed cronológico de celebrações (todos os colaboradores da empresa)
  - [ ] Criar celebração: tipo, texto, menção de colaboradores
  - [ ] Reagir com emoji e comentar
- [ ] Interface ADMIN — Comunicados
  - [ ] Criar comunicado: título, conteúdo rich text, segmentação por departamento, agendamento
  - [ ] Listagem de comunicados enviados e agendados
- [ ] Interface COLABORADOR — receber comunicados
  - [ ] Secção de comunicados no sidebar com badge de não lidos
  - [ ] Marcar como lido
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 8: Dashboards e People Analytics

- [ ] Dashboard do Colaborador (`/dashboard`)
  - [ ] Widget: humor de hoje (termômetro)
  - [ ] Widget: avaliações pendentes
  - [ ] Widget: progresso dos OKRs individuais
  - [ ] Widget: feedbacks recebidos recentemente
  - [ ] Widget: pesquisas activas
- [ ] Dashboard do Gestor
  - [ ] Visão consolidada da equipa: humor médio, % avaliações respondidas, OKRs em risco
  - [ ] Lista de liderados com status de cada módulo
- [ ] Dashboard do RH/Admin
  - [ ] Indicadores gerais: total colaboradores, taxa de engajamento, NPS interno
  - [ ] Gráfico de humor da empresa ao longo do tempo
  - [ ] Tabela de ciclos de avaliação activos
  - [ ] Mapa de OKRs da empresa
- [ ] People Analytics
  - [ ] Correlação entre humor médio e performance (avaliação de desempenho)
  - [ ] Identificação de colaboradores em risco (humor baixo + avaliação baixa + sem feedbacks)
  - [ ] Exportação de relatórios em CSV por módulo
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

### Phase 9: Notificações e Polimento Final

- [ ] Sistema de notificações in-app
  - [ ] Modelo `Notification`: `id`, `user_id`, `type`, `title`, `body`, `read`, `link`, `created_at`
  - [ ] Notificações para: feedback recebido, avaliação pendente, OKR com check-in atrasado, pesquisa activa, comunicado novo
  - [ ] Sininho no header com badge de não lidas
  - [ ] Marcar todas como lidas
- [ ] Notificações por email
  - [ ] Configurar Resend (ou Supabase Edge Functions com SMTP)
  - [ ] Templates de email para: convite de utilizador, avaliação pendente, feedback recebido
- [ ] Responsividade mobile
  - [ ] Testar e ajustar todos os ecrãs para mobile (375px+)
  - [ ] Sidebar colapsável em mobile
- [ ] Acessibilidade básica
  - [ ] Atributos `aria-label` em botões e ícones
  - [ ] Navegação por teclado nas modais e formulários
- [ ] Perform a self-review of your code, once you're certain it's 100% complete to the requirements in this phase mark the task as done.
- [ ] STOP and wait for human review

---

## Important Considerations & Requirements

- [ ] Não sobre-engenheirar — começar simples, adicionar complexidade só quando necessário
- [ ] Não adicionar código placeholder ou TODO — cada fase deve ficar funcional
- [ ] Isolamento de tenant é obrigatório — toda query deve filtrar por `company_id`
- [ ] Supabase Row Level Security (RLS) deve ser activado na tabela `User` e outras sensíveis
- [ ] Nunca expor dados de uma empresa para outra — validar `company_id` em todas as API routes
- [ ] Formulários devem ter validação client-side e server-side
- [ ] Erros de API devem retornar mensagens claras em português
- [ ] Datas devem respeitar timezone do Brasil (America/Sao_Paulo)
- [ ] Uploads de avatar vão para Supabase Storage com bucket separado por `company_id`

## Technical Decisions

- **Next.js App Router**: Server Components para páginas de listagem (melhor performance), Client Components apenas onde há interactividade
- **Prisma**: ORM principal para todas as queries — evita SQL manual e facilita migrations
- **Supabase Auth**: Gestão de sessão via cookies com `@supabase/ssr` — compatível com App Router
- **Multi-tenancy por coluna**: Cada tabela tem `company_id` — simples, eficaz para o volume esperado
- **Tailwind sem UI library**: Mais controlo visual, sem dependência de componentes de terceiros

## Testing Strategy

- Testar cada página manualmente após implementação da fase
- Criar pelo menos 2 empresas de teste para validar isolamento de tenant
- Criar utilizadores com os 3 perfis (ADMIN, MANAGER, EMPLOYEE) e validar permissões
- Testar fluxo completo de avaliação de desempenho de ponta a ponta antes de avançar para a fase seguinte

## Debugging Protocol

- **Erro de autenticação**: Verificar cookies de sessão e middleware de redireccioamento
- **Dados de outro tenant a aparecer**: Verificar se `company_id` está a ser filtrado na query
- **Migração Prisma a falhar**: Verificar `DATABASE_URL` e se o Supabase está acessível
- **Requisitos pouco claros**: Parar e pedir clarificação

## QA Checklist

- [ ] Todas as rotas protegidas redirreccionam para `/login` sem sessão
- [ ] Um utilizador de empresa A não consegue ver dados de empresa B
- [ ] Colaborador não consegue aceder a funcionalidades de ADMIN ou GESTOR
- [ ] Formulários validam e mostram erros claros em português
- [ ] Upload de avatar funciona e é guardado no Supabase Storage
- [ ] Pesquisas anónimas não guardam `user_id`
- [ ] Exportação CSV funciona em todas as páginas com relatórios
- [ ] Interface funcional em mobile (375px)
- [ ] Sem erros no console do browser em qualquer página
- [ ] Variáveis de ambiente nunca expostas no client-side

---

## Como usar este plano com o Claude Code

1. Abra o Claude Code no terminal dentro da pasta do seu projecto
2. Cole o seguinte prompt inicial:

```
Leia o arquivo DEVELOPMENT_PLAN.md e execute a Phase 1 completa.
Siga cada tarefa na ordem indicada. Ao final da fase, faça a self-review
e aguarde minha aprovação antes de continuar.
```

3. Após revisar o resultado de cada fase, diga ao Claude Code:
```
Phase 1 aprovada. Execute a Phase 2.
```

4. Se algo não estiver certo numa fase, diga especificamente o que corrigir antes de avançar.

> **Dica**: Mantenha o `DEVELOPMENT_PLAN.md` na raiz do projecto. O Claude Code vai marcar as tarefas como concluídas conforme avança — isso serve como registo do progresso.
