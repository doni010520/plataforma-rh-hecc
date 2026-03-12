import { PrismaClient } from '@prisma/client';

function ensurePgBouncerParams(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    // Only add pgbouncer params if connecting to port 6543 (Supabase pooler)
    if (parsed.port === '6543') {
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1');
      }
      return parsed.toString();
    }
  } catch {
    // If URL parsing fails, return as-is
  }
  return url;
}

// Ensure PgBouncer compatibility params are present at runtime
const databaseUrl = ensurePgBouncerParams(process.env.DATABASE_URL);
if (databaseUrl && databaseUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
