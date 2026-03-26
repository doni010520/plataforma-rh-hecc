import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// All configurable modules and their default visibility for EMPLOYEE
const MODULE_DEFAULTS: Record<string, boolean> = {
  dashboard: true,
  colaboradores: false,
  departamentos: false,
  avaliacoes: true,
  'avaliacoes-experiencia': false,
  'plano-de-sucessao': false,
  incentivos: false,
  feedback: true,
  'one-on-one': true,
  okrs: true,
  pdi: true,
  onboarding: true,
  trilhas: true,
  'departamento-pessoal': true,
  recrutamento: false,
  nr01: true,
  'inteligencia-artificial': false,
  pesquisas: true,
  mural: true,
  enps: true,
  gamificacao: true,
  comunicados: true,
  analytics: false,
  disc: true,
};

async function ensureSettingsColumn() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'
    `);
  } catch {
    // column likely already exists or DB doesn't support IF NOT EXISTS
  }
}

async function getCompanySettings(companyId: string): Promise<Record<string, unknown>> {
  try {
    const result = await prisma.$queryRaw<{ settings: unknown }[]>`
      SELECT settings FROM companies WHERE id = ${companyId}
    `;
    if (result?.[0]?.settings && typeof result[0].settings === 'object') {
      return result[0].settings as Record<string, unknown>;
    }
  } catch {
    // settings column may not exist yet — try to create it
    await ensureSettingsColumn();
  }
  return {};
}

async function setCompanySettings(companyId: string, settings: Record<string, unknown>) {
  await ensureSettingsColumn();
  const json = JSON.stringify(settings);
  await prisma.$executeRaw`
    UPDATE companies SET settings = ${json}::jsonb WHERE id = ${companyId}
  `;
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const settings = await getCompanySettings(user.companyId);
  const employeeModules = (settings.employeeModules as Record<string, boolean>) || {};

  // Merge defaults with saved settings
  const merged: Record<string, boolean> = {};
  for (const [key, defaultValue] of Object.entries(MODULE_DEFAULTS)) {
    merged[key] = key in employeeModules ? employeeModules[key] : defaultValue;
  }

  return NextResponse.json({ employeeModules: merged });
}

export async function PUT(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role !== 'ADMIN') return forbiddenResponse();

  const body = await request.json();
  const { employeeModules } = body as { employeeModules: Record<string, boolean> };

  if (!employeeModules || typeof employeeModules !== 'object') {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const currentSettings = await getCompanySettings(user.companyId);

  await setCompanySettings(user.companyId, { ...currentSettings, employeeModules });

  return NextResponse.json({ success: true });
}
