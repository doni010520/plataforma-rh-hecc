import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse, hasRole } from '@/lib/auth';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  if (!hasRole(user.role, ['ADMIN', 'MANAGER'])) {
    return forbiddenResponse('Apenas gestores e administradores podem exportar dados.');
  }

  const { searchParams } = new URL(request.url);
  const exportModule = searchParams.get('module');

  if (!exportModule) {
    return NextResponse.json({ error: 'Parâmetro "module" é obrigatório.' }, { status: 400 });
  }

  let csv = '';
  let filename = '';

  switch (exportModule) {
    case 'employees': {
      const employees = await prisma.user.findMany({
        where: { companyId: user.companyId, active: true },
        include: {
          department: { select: { name: true } },
          manager: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      });

      csv = toCsv(
        ['Nome', 'Email', 'Cargo', 'Departamento', 'Gestor', 'Perfil', 'Data Cadastro'],
        employees.map((e) => [
          e.name,
          e.email,
          e.jobTitle,
          e.department?.name,
          e.manager?.name,
          e.role,
          new Date(e.createdAt).toLocaleDateString('pt-BR'),
        ]),
      );
      filename = 'colaboradores.csv';
      break;
    }

    case 'feedback': {
      const feedbacks = await prisma.feedback.findMany({
        where: { companyId: user.companyId },
        include: {
          fromUser: { select: { name: true } },
          toUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      csv = toCsv(
        ['De', 'Para', 'Tipo', 'Visibilidade', 'Conteúdo', 'Data'],
        feedbacks.map((f) => [
          f.fromUser.name,
          f.toUser.name,
          f.type,
          f.visibility,
          f.content,
          new Date(f.createdAt).toLocaleDateString('pt-BR'),
        ]),
      );
      filename = 'feedbacks.csv';
      break;
    }

    case 'okrs': {
      const objectives = await prisma.objective.findMany({
        where: { companyId: user.companyId },
        include: {
          owner: { select: { name: true } },
          keyResults: true,
        },
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      });

      const rows: (string | number | null)[][] = [];
      objectives.forEach((obj) => {
        if (obj.keyResults.length === 0) {
          rows.push([
            obj.title,
            obj.level,
            `Q${obj.quarter}/${obj.year}`,
            obj.status,
            obj.owner.name,
            '',
            '',
            '',
            '',
            '',
          ]);
        }
        obj.keyResults.forEach((kr) => {
          const range = kr.targetValue - kr.startValue;
          const progress =
            kr.metricType === 'BOOLEAN'
              ? kr.currentValue >= 1
                ? 100
                : 0
              : range === 0
                ? 100
                : Math.min(Math.max(((kr.currentValue - kr.startValue) / range) * 100, 0), 100);

          rows.push([
            obj.title,
            obj.level,
            `Q${obj.quarter}/${obj.year}`,
            obj.status,
            obj.owner.name,
            kr.title,
            kr.metricType,
            kr.currentValue,
            kr.targetValue,
            Math.round(progress),
          ]);
        });
      });

      csv = toCsv(
        [
          'Objectivo',
          'Nível',
          'Período',
          'Status',
          'Responsável',
          'Key Result',
          'Tipo Métrica',
          'Valor Actual',
          'Meta',
          'Progresso %',
        ],
        rows,
      );
      filename = 'okrs.csv';
      break;
    }

    case 'mood': {
      const moodLogs = await prisma.moodLog.findMany({
        where: { companyId: user.companyId },
        include: {
          user: { select: { name: true, department: { select: { name: true } } } },
        },
        orderBy: { date: 'desc' },
      });

      csv = toCsv(
        ['Colaborador', 'Departamento', 'Humor (1-5)', 'Nota', 'Data'],
        moodLogs.map((m) => [
          m.user.name,
          m.user.department?.name,
          m.mood,
          m.note,
          new Date(m.date).toLocaleDateString('pt-BR'),
        ]),
      );
      filename = 'humor.csv';
      break;
    }

    case 'analytics': {
      // People analytics export: mood + performance + feedback per employee
      const employees = await prisma.user.findMany({
        where: { companyId: user.companyId, active: true },
        select: {
          id: true,
          name: true,
          jobTitle: true,
          department: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      });

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const latestCycle = await prisma.reviewCycle.findFirst({
        where: { companyId: user.companyId, status: 'CLOSED' },
        orderBy: { endDate: 'desc' },
        select: { id: true },
      });

      const rows = await Promise.all(
        employees.map(async (emp) => {
          const moods = await prisma.moodLog.findMany({
            where: { userId: emp.id, date: { gte: threeMonthsAgo } },
            select: { mood: true },
          });
          const avgMood =
            moods.length > 0
              ? Math.round((moods.reduce((a, m) => a + m.mood, 0) / moods.length) * 100) / 100
              : null;

          let avgPerformance: number | null = null;
          if (latestCycle) {
            const answers = await prisma.reviewAnswer.findMany({
              where: {
                assignment: { cycleId: latestCycle.id, evaluateeId: emp.id, status: 'DONE' },
              },
              select: { score: true },
            });
            if (answers.length > 0) {
              avgPerformance =
                Math.round((answers.reduce((a, ans) => a + (ans.score ?? 0), 0) / answers.length) * 100) / 100;
            }
          }

          const feedbackCount = await prisma.feedback.count({
            where: { toUserId: emp.id, companyId: user.companyId, createdAt: { gte: threeMonthsAgo } },
          });

          const risks: string[] = [];
          if (avgMood !== null && avgMood < 3) risks.push('Humor baixo');
          if (avgPerformance !== null && avgPerformance < 2.5) risks.push('Avaliação baixa');
          if (feedbackCount === 0) risks.push('Sem feedback');

          return [
            emp.name,
            emp.jobTitle,
            emp.department?.name,
            avgMood,
            avgPerformance,
            feedbackCount,
            risks.length > 0 ? risks.join('; ') : 'OK',
          ] as (string | number | null)[];
        }),
      );

      csv = toCsv(
        ['Nome', 'Cargo', 'Departamento', 'Humor Médio', 'Avaliação Média', 'Feedbacks (3m)', 'Status Risco'],
        rows,
      );
      filename = 'analytics.csv';
      break;
    }

    default:
      return NextResponse.json(
        { error: `Módulo "${exportModule}" não suportado. Use: employees, feedback, okrs, mood, analytics.` },
        { status: 400 },
      );
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
