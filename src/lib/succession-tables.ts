import { prisma } from '@/lib/prisma';

export async function ensureSuccessionTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS succession_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        position_title TEXT NOT NULL,
        department_id TEXT,
        current_holder_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS succession_candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES succession_plans(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        readiness TEXT NOT NULL DEFAULT '1_YEAR',
        strengths TEXT DEFAULT '',
        development_areas TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(plan_id, user_id)
      )
    `);
  } catch { /* Tables likely exist */ }
}
