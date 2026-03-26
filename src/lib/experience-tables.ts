import { prisma } from '@/lib/prisma';

export async function ensureExperienceTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS experience_eval_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        periods JSONB NOT NULL DEFAULT '[30,45,60,90]',
        template_cycle_id TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS experience_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL,
        target_user_id TEXT NOT NULL,
        period_days INT NOT NULL,
        admission_date TIMESTAMPTZ NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, target_user_id, period_days)
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_date TIMESTAMPTZ
    `);
  } catch {
    // Tables likely already exist
  }
}
