/**
 * Script para criar usuários de teste para cada nível de acesso.
 *
 * Uso: npx tsx scripts/seed-test-users.ts
 *
 * Cria 3 usuários na mesma empresa:
 *   - Admin:    admin@teste.com     / Teste@123
 *   - Gestor:   gestor@teste.com    / Teste@123
 *   - Employee: colaborador@teste.com / Teste@123
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const prisma = new PrismaClient();

const PASSWORD = 'Teste@123';

const TEST_USERS = [
  {
    email: 'admin@teste.com',
    name: 'Admin Teste',
    role: 'ADMIN' as const,
    jobTitle: 'Diretor de RH',
  },
  {
    email: 'gestor@teste.com',
    name: 'Gestor Teste',
    role: 'MANAGER' as const,
    jobTitle: 'Gerente de Equipe',
  },
  {
    email: 'colaborador@teste.com',
    name: 'Colaborador Teste',
    role: 'EMPLOYEE' as const,
    jobTitle: 'Analista de RH',
  },
];

async function main() {
  console.log('🚀 Criando usuários de teste...\n');

  // 1. Find or create company
  let company = await prisma.company.findFirst({
    where: { slug: 'empresa-teste' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Empresa Teste',
        slug: 'empresa-teste',
      },
    });
    console.log('✅ Empresa "Empresa Teste" criada');
  } else {
    console.log('ℹ️  Empresa "Empresa Teste" já existe');
  }

  // 2. Find or create department
  let department = await prisma.department.findFirst({
    where: { companyId: company.id, name: 'Recursos Humanos' },
  });

  if (!department) {
    department = await prisma.department.create({
      data: {
        name: 'Recursos Humanos',
        companyId: company.id,
      },
    });
    console.log('✅ Departamento "Recursos Humanos" criado');
  }

  // 3. Create users
  const createdUsers: Record<string, string> = {};

  for (const testUser of TEST_USERS) {
    // Check if user already exists in Prisma
    const existing = await prisma.user.findFirst({
      where: { email: testUser.email, companyId: company.id },
    });

    if (existing) {
      console.log(`ℹ️  ${testUser.role.padEnd(8)} | ${testUser.email} já existe`);
      createdUsers[testUser.role] = existing.id;
      continue;
    }

    // Create in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      // Maybe user exists in Supabase but not in Prisma
      if (authError.message?.includes('already been registered')) {
        // Get existing auth user
        const { data: listData } = await supabase.auth.admin.listUsers();
        const authUser = listData?.users?.find((u) => u.email === testUser.email);
        if (authUser) {
          const user = await prisma.user.create({
            data: {
              authId: authUser.id,
              companyId: company.id,
              email: testUser.email,
              name: testUser.name,
              role: testUser.role,
              jobTitle: testUser.jobTitle,
              departmentId: department.id,
            },
          });
          createdUsers[testUser.role] = user.id;
          console.log(`✅ ${testUser.role.padEnd(8)} | ${testUser.email} (revinculado ao Supabase)`);
          continue;
        }
      }
      console.error(`❌ Erro Supabase para ${testUser.email}:`, authError.message);
      continue;
    }

    // Create in Prisma
    const user = await prisma.user.create({
      data: {
        authId: authData.user.id,
        companyId: company.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        jobTitle: testUser.jobTitle,
        departmentId: department.id,
      },
    });

    createdUsers[testUser.role] = user.id;
    console.log(`✅ ${testUser.role.padEnd(8)} | ${testUser.email} criado`);
  }

  // 4. Set manager relationships
  if (createdUsers['MANAGER'] && createdUsers['EMPLOYEE']) {
    await prisma.user.update({
      where: { id: createdUsers['EMPLOYEE'] },
      data: { managerId: createdUsers['MANAGER'] },
    });
    console.log('\n✅ Colaborador vinculado ao Gestor como subordinado');
  }

  console.log('\n' + '='.repeat(55));
  console.log('  USUÁRIOS DE TESTE CRIADOS COM SUCESSO!');
  console.log('='.repeat(55));
  console.log('');
  console.log('  Empresa: Empresa Teste');
  console.log('  Senha:   Teste@123');
  console.log('');
  console.log('  ┌──────────────┬─────────────────────────┐');
  console.log('  │ Perfil       │ Email                   │');
  console.log('  ├──────────────┼─────────────────────────┤');
  console.log('  │ Admin        │ admin@teste.com         │');
  console.log('  │ Gestor       │ gestor@teste.com        │');
  console.log('  │ Colaborador  │ colaborador@teste.com   │');
  console.log('  └──────────────┴─────────────────────────┘');
  console.log('');
  console.log('  Acesse: https://plataforma-rh-hecc.vercel.app/login');
  console.log('');
}

main()
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
