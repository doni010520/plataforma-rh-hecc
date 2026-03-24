# FeedFlow

Plataforma completa de gestão de pessoas, desenvolvida com Next.js 14, Supabase e PostgreSQL.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Banco de Dados | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Autenticação | Supabase Auth |
| Email | Resend (domínio benitechlab.com) |
| IA | OpenAI GPT-4.1-mini |
| Estilização | Tailwind CSS (dark/light mode) |
| Deploy | Vercel (região gru1 - São Paulo) |

## Módulos

### Gestão de Pessoas
- **Colaboradores** — Cadastro, convite por email, edição, ativação/desativação
- **Departamentos** — Estrutura organizacional
- **Perfil** — Dados pessoais do colaborador
- **Dept. Pessoal** — Documentos, holerites, férias, histórico salarial

### Desempenho
- **Avaliações** — Ciclos 180° e 360° com critérios personalizados
- **Feedback** — Elogios, construtivos e solicitações (público/privado)
- **OKRs** — Objetivos e Key Results por trimestre (empresa/equipe/individual)
- **PDI** — Planos de Desenvolvimento Individual com tarefas e comentários
- **1:1** — Ciclos de reuniões one-on-one com tópicos e atas

### Engajamento
- **Pesquisas** — Clima, pulso, satisfação (escala, múltipla escolha, texto)
- **eNPS** — Employee Net Promoter Score
- **Mural** — Celebrações com @menções, reações, edição e exclusão
- **Comunicados** — Avisos com controle de leitura
- **Gamificação** — Pontos, badges e ranking
- **DISC** — Avaliação de perfil comportamental
- **Humor** — Termômetro diário de humor

### Compliance
- **NR-01** — Avaliações psicossociais, inventários de risco, planos de ação, canal de denúncias

### Recrutamento
- **Vagas** — Publicação com página de carreiras pública
- **Candidatos** — Pipeline com etapas, entrevistas e avaliações (ATS)

### Capacitação
- **Onboarding** — Templates e processos com tarefas e avaliação
- **Trilhas** — Trilhas de aprendizagem com conteúdos e progresso

### Inteligência
- **IA** — Chat com GPT-4.1-mini, análises de dados, alertas e insights
- **Analytics** — People Analytics com dashboards

### Administração
- **Permissões** — Configuração de módulos visíveis por perfil (EMPLOYEE)
- **Ajuda** — Central de ajuda com 10 tópicos FAQ
- **Notificações** — Sistema de notificações em tempo real

## Arquitetura

```
src/
├── app/
│   ├── (auth)/              # Login, registro, aceitar convite
│   ├── (authenticated)/     # 25 módulos protegidos
│   ├── api/                 # 22+ endpoints REST
│   ├── auth/                # Callback e confirmação de convite
│   └── vagas/               # Página pública de vagas
├── components/              # Sidebar, Header, Dashboard cards, AI Chat
├── contexts/                # ThemeContext (dark/light)
├── lib/
│   ├── auth.ts              # getCurrentUser com React.cache()
│   ├── prisma.ts            # PrismaClient singleton com PgBouncer
│   ├── ai.ts                # Integração OpenAI
│   ├── email.ts             # Resend client
│   ├── email-templates.ts   # Templates HTML de email
│   ├── gamification.ts      # Sistema de pontos
│   └── supabase/            # Client, server e middleware
└── middleware.ts             # Auth guard + session refresh
```

## Controle de Acesso

| Funcionalidade | ADMIN | MANAGER | EMPLOYEE |
|---------------|:-----:|:-------:|:--------:|
| Cadastrar colaboradores | ✅ | ❌ | ❌ |
| Editar/desativar colaboradores | ✅ | ❌ | ❌ |
| Configurar permissões | ✅ | ❌ | ❌ |
| Dashboard gerencial | ✅ | ✅ | ❌ |
| Painel administrativo | ✅ | ❌ | ❌ |
| Chat IA | ✅ | ✅ | ❌ |
| Módulos configuráveis | ✅ | ✅ | Conforme permissões |

## Fluxo de Convite de Colaborador

1. Admin cadastra colaborador em `/colaboradores`
2. Sistema gera link via `supabase.auth.admin.generateLink()`
3. Email personalizado enviado via Resend (marca FeedFlow, tema escuro + esmeralda)
4. Colaborador clica "Aceitar Convite" → Supabase valida token
5. Redireciona para `/auth/confirmar` → captura sessão (client-side)
6. Redireciona para `/aceitar-convite` → formulário de criar senha
7. Após definir senha → dashboard

Admin pode **reenviar convite** a qualquer momento pela coluna de ações.

## Tema Visual

- **Dark mode**: Cinza neutro (`gray-800/900`) com detalhes verde esmeralda (`emerald-400/500`)
- **Light mode**: Fundo branco neutro com detalhes esmeralda
- Alternância via botão no header (persistido em localStorage)
- Emails seguem o mesmo tema escuro com header esmeralda

## Performance

- `React.cache()` no `getCurrentUser()` — deduplica chamadas na mesma request
- `supabase.auth.getSession()` nos server components — leitura local do JWT (0ms) em vez de `getUser()` (200-500ms HTTP)
- Middleware valida token com `getUser()` uma única vez por request
- `userRole` passado como prop do layout para Sidebar e AiChatWrapper (elimina `/api/me`)
- Vercel na região `gru1` (São Paulo) — mesma região do Supabase DB
- PgBouncer habilitado com connection_limit=5 para queries paralelas
- PrismaClient singleton em `globalThis` para reuso entre invocações

## Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Banco de Dados
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres

# Email
RESEND_API_KEY=re_xxx

# IA
OPENAI_API_KEY=sk-xxx

# App
NEXT_PUBLIC_APP_URL=https://plataforma-rh-hecc.vercel.app
```

## Configuração do Supabase

No dashboard do Supabase (Authentication > URL Configuration), adicione às **Redirect URLs**:
```
https://plataforma-rh-hecc.vercel.app/**
```

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Rodar em modo desenvolvimento
npm run dev

# Abrir no navegador
open http://localhost:3000
```

## Deploy

O deploy é automático via Vercel ao fazer push/merge na branch `main`.

```bash
# Push para produção
git push origin main

# Ou via PR
gh pr create --base main
gh pr merge
```

## Banco de Dados

O schema Prisma contém **52 modelos** incluindo:
- Gestão: Company, Department, User
- Avaliações: ReviewCycle, ReviewCriteria, ReviewAssignment, ReviewAnswer
- Feedback, OKRs (Objective, KeyResult), PDI (DevelopmentPlan, DevelopmentTask)
- Pesquisas: Survey, SurveyQuestion, SurveyResponse
- NR-01: PsychosocialAssessment, RiskInventory, ActionPlan, Complaint
- Recrutamento: JobPosition, Candidate, Application, Interview
- Onboarding: OnboardingTemplate, OnboardingProcess
- Trilhas: LearningTrack, LearningContent, TrackEnrollment
- Gamificação: GamificationPoints, Badge, UserBadge
- Comunicação: Celebration, Announcement, Notification
- IA: AiAnalysis, AiAlert

## Licença

Projeto proprietário — FeedFlow.
