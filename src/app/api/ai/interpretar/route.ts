import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { generateCompletion, parseJsonResponse } from '@/lib/ai';

const SYSTEM_PROMPT_INTERPRET = `Você é um especialista em análise de dados de RH. Analise os dados fornecidos e forneça uma interpretação clara e acionável em português brasileiro.

Responda APENAS com JSON válido no formato:
{
  "interpretation": "Parágrafo com interpretação geral dos dados (3-5 frases)",
  "highlights": ["destaque 1", "destaque 2", "destaque 3"],
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"]
}

Regras:
1. Baseie-se APENAS nos dados fornecidos
2. Identifique padrões, pontos fortes e áreas de atenção
3. Forneça 3-5 destaques e 2-4 recomendações práticas
4. Seja direto e profissional`;

interface InterpretationResponse {
  interpretation: string;
  highlights: string[];
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  const body = await request.json();
  const { type, targetId } = body as { type: string; targetId: string };

  if (!type || !targetId) {
    return Response.json({ error: 'type e targetId são obrigatórios.' }, { status: 400 });
  }

  let contextText = '';

  try {
    if (type === 'survey') {
      contextText = await buildSurveyContext(targetId, user.companyId);
    } else if (type === 'avaliacao') {
      contextText = await buildAvaliacaoContext(targetId, user.companyId);
    } else if (type === 'nr01') {
      contextText = await buildNr01Context(targetId, user.companyId);
    } else {
      return Response.json({ error: 'Tipo inválido.' }, { status: 400 });
    }

    if (!contextText) {
      return Response.json({ error: 'Dados insuficientes para interpretação.' }, { status: 400 });
    }

    const raw = await generateCompletion(SYSTEM_PROMPT_INTERPRET, contextText, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const parsed = parseJsonResponse<InterpretationResponse>(raw);

    if (parsed) {
      return Response.json(parsed);
    }

    // Fallback: return raw as interpretation
    return Response.json({
      interpretation: raw,
      highlights: [],
      recommendations: [],
    });
  } catch (error) {
    console.error('[AI Interpretar] Error:', error);
    return Response.json({ error: 'Erro ao gerar interpretação.' }, { status: 500 });
  }
}

async function buildSurveyContext(surveyId: string, companyId: string): Promise<string> {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, companyId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!survey) return '';

  const totalResponses = await prisma.surveyResponse.count({
    where: { surveyId },
  });

  const totalUsers = await prisma.user.count({
    where: { companyId, active: true },
  });

  const allAnswers = await prisma.surveyAnswer.findMany({
    where: { response: { surveyId } },
    include: { question: true },
  });

  let text = `PESQUISA: "${survey.title}" (${survey.anonymous ? 'anônima' : 'identificada'})\n`;
  text += `Taxa de resposta: ${totalResponses}/${totalUsers} (${totalUsers > 0 ? ((totalResponses / totalUsers) * 100).toFixed(0) : 0}%)\n\n`;

  for (const q of survey.questions) {
    const qAnswers = allAnswers.filter(a => a.questionId === q.id);
    text += `Pergunta: "${q.text}" (${q.type})\n`;

    if (q.type === 'SCALE') {
      const values = qAnswers.map(a => parseInt(a.value)).filter(v => !isNaN(v));
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      values.forEach(v => { if (dist[v] !== undefined) dist[v]++; });
      text += `  Média: ${avg.toFixed(1)}/5.0 | Distribuição: ${Object.entries(dist).map(([k, v]) => `${k}★=${v}`).join(', ')}\n`;
    } else if (q.type === 'MULTIPLE_CHOICE') {
      const dist: Record<string, number> = {};
      qAnswers.forEach(a => { dist[a.value] = (dist[a.value] || 0) + 1; });
      text += `  Opções: ${Object.entries(dist).map(([k, v]) => `"${k}"=${v}`).join(', ')}\n`;
    } else {
      text += `  Respostas de texto (${qAnswers.length}): ${qAnswers.slice(0, 10).map(a => `"${a.value.substring(0, 100)}"`).join('; ')}\n`;
    }
    text += '\n';
  }

  return text;
}

async function buildAvaliacaoContext(cycleId: string, companyId: string): Promise<string> {
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id: cycleId, companyId },
    include: { criteria: { orderBy: { name: 'asc' } } },
  });

  if (!cycle) return '';

  const assignments = await prisma.reviewAssignment.findMany({
    where: { cycleId, status: 'DONE' },
    include: {
      evaluatee: { select: { name: true, department: { select: { name: true } } } },
      answers: { include: { criteria: true } },
    },
  });

  if (assignments.length === 0) return '';

  let text = `CICLO DE AVALIAÇÃO: "${cycle.name}" (tipo: ${cycle.type})\n`;
  text += `Critérios: ${cycle.criteria.map(c => `${c.name} (peso ${c.weight})`).join(', ')}\n`;
  text += `Total de avaliações concluídas: ${assignments.length}\n\n`;

  // Aggregate by evaluatee
  const byEvaluatee: Record<string, { name: string; dept: string; scores: Record<string, number[]> }> = {};
  for (const a of assignments) {
    const eId = a.evaluateeId;
    if (!byEvaluatee[eId]) {
      byEvaluatee[eId] = {
        name: a.evaluatee.name,
        dept: a.evaluatee.department?.name || 'Sem dept.',
        scores: {},
      };
    }
    for (const ans of a.answers) {
      if (ans.score !== null) {
        if (!byEvaluatee[eId].scores[ans.criteria.name]) byEvaluatee[eId].scores[ans.criteria.name] = [];
        byEvaluatee[eId].scores[ans.criteria.name].push(ans.score);
      }
    }
  }

  // Department averages
  const deptScores: Record<string, number[]> = {};
  for (const e of Object.values(byEvaluatee)) {
    const allScores = Object.values(e.scores).flat();
    const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    if (!deptScores[e.dept]) deptScores[e.dept] = [];
    deptScores[e.dept].push(avg);
  }

  text += 'RESULTADOS POR DEPARTAMENTO:\n';
  for (const [dept, scores] of Object.entries(deptScores)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    text += `  ${dept}: média ${avg.toFixed(1)}/5.0 (${scores.length} avaliados)\n`;
  }

  text += '\nRESULTADOS INDIVIDUAIS (top e bottom):\n';
  const sorted = Object.entries(byEvaluatee)
    .map(([, e]) => {
      const allScores = Object.values(e.scores).flat();
      const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
      return { ...e, avg };
    })
    .sort((a, b) => b.avg - a.avg);

  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();
  text += '  Top 5: ' + top5.map(e => `${e.name} (${e.avg.toFixed(1)})`).join(', ') + '\n';
  text += '  Bottom 5: ' + bottom5.map(e => `${e.name} (${e.avg.toFixed(1)})`).join(', ') + '\n';

  return text;
}

async function buildNr01Context(assessmentId: string, companyId: string): Promise<string> {
  const assessment = await prisma.psychosocialAssessment.findFirst({
    where: { id: assessmentId, companyId },
    include: { questions: true },
  });

  if (!assessment) return '';

  const results = await prisma.psychosocialResult.findMany({
    where: { assessmentId },
    orderBy: { category: 'asc' },
  });

  const responseCount = await prisma.psychosocialResponse.count({
    where: { assessmentId },
  });

  let text = `AVALIAÇÃO PSICOSSOCIAL NR-01: "${assessment.title}"\n`;
  text += `Total de respostas: ${responseCount}\n`;
  text += `Anônima: ${assessment.anonymous ? 'Sim' : 'Não'}\n\n`;

  if (results.length > 0) {
    text += 'RESULTADOS POR CATEGORIA:\n';
    for (const r of results) {
      text += `  ${r.category}: média ${r.averageScore.toFixed(1)}/5.0 | Nível de risco: ${r.riskLevel} (${r.totalResponses} respostas)\n`;
    }
  }

  text += '\nPERGUNTAS DA AVALIAÇÃO:\n';
  for (const q of assessment.questions) {
    text += `  [${q.category}] ${q.text}\n`;
  }

  return text;
}
