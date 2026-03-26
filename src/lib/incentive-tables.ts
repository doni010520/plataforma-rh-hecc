import { prisma } from '@/lib/prisma';

export async function ensureIncentiveTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS incentive_programs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'PLR',
        cycle_period TEXT NOT NULL DEFAULT 'ANNUAL',
        status TEXT NOT NULL DEFAULT 'DRAFT',
        start_date DATE,
        end_date DATE,
        eligibility_criteria JSONB DEFAULT '{}',
        total_budget DECIMAL(12,2) DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS incentive_eligibilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES incentive_programs(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        eligible BOOLEAN NOT NULL DEFAULT true,
        calculated_amount DECIMAL(12,2) DEFAULT 0,
        performance_score DECIMAL(5,2) DEFAULT 0,
        achievement_percentage DECIMAL(5,2) DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(program_id, user_id)
      )
    `);
  } catch { /* Tables likely exist */ }
}
