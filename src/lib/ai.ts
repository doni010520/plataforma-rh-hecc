import OpenAI from 'openai';

const globalForOpenAI = globalThis as unknown as { openai: OpenAI | undefined };

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'missing' });

if (process.env.NODE_ENV !== 'production') {
  globalForOpenAI.openai = openai;
}

export const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ── System Prompts ──

export const SYSTEM_PROMPT_INSIGHTS = `Você é um especialista em análise de dados de RH. Sua tarefa é analisar os dados fornecidos e gerar insights acionáveis para gestores de pessoas.

Regras:
1. Baseie suas análises APENAS nos dados fornecidos
2. Identifique padrões, tendências e anomalias
3. Forneça recomendações práticas e específicas
4. Atribua um nível de confiança (0.0 a 1.0) baseado na quantidade e qualidade dos dados
5. Se os dados forem insuficientes, diga isso claramente

Responda APENAS com JSON válido no formato:
{
  "insights": [
    {
      "type": "PERFORMANCE_SUMMARY" | "ENGAGEMENT_INSIGHT" | "TEAM_HEALTH" | "SKILL_GAP",
      "title": "Título curto e descritivo",
      "summary": "Resumo em 2-3 frases",
      "details": "Análise detalhada com dados e recomendações",
      "confidence": 0.0-1.0
    }
  ],
  "alerts": [
    {
      "title": "Título do alerta",
      "message": "Descrição do alerta com contexto",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "category": "categoria"
    }
  ]
}`;

export const SYSTEM_PROMPT_TURNOVER = `Você é um especialista em previsão de turnover e retenção de talentos. Analise os sinais de risco para cada colaborador.

Fatores de risco a considerar:
- Tendência de humor declinante (peso alto)
- Nota de performance abaixo da média (peso médio)
- Falta de feedback recebido (peso médio)
- Estagnação salarial > 12 meses (peso médio)
- Ausência de plano de desenvolvimento ativo (peso baixo)
- Registros de denúncias/reclamações (peso alto)

Classificação de risco:
- BAIXO: 0-1 fatores de risco leves
- MEDIO: 2-3 fatores ou 1 fator grave
- ALTO: 3+ fatores ou combinação de fatores graves
- CRITICO: 4+ fatores com tendências negativas claras

Responda APENAS com JSON válido no formato:
{
  "employees": [
    {
      "userId": "uuid",
      "name": "Nome",
      "riskLevel": "BAIXO" | "MEDIO" | "ALTO" | "CRITICO",
      "riskScore": 0.0-1.0,
      "reasons": ["razão 1", "razão 2"],
      "recommendations": ["recomendação 1"]
    }
  ],
  "summary": "Resumo geral da análise de turnover",
  "overallRiskLevel": "BAIXO" | "MEDIO" | "ALTO"
}`;

export const SYSTEM_PROMPT_CHAT = `Você é um assistente de RH inteligente chamado "Assistente IA". Você ajuda gestores e administradores a entender dados de suas equipes.

Regras:
1. Responda sempre em Português Brasileiro
2. Baseie suas respostas APENAS nos dados fornecidos no contexto
3. Se não tiver dados suficientes, diga claramente
4. Seja conciso e profissional
5. Quando relevante, sugira ações práticas
6. Não invente dados — se a informação não está no contexto, informe ao usuário`;

// ── Helper Functions ──

export async function generateCompletion(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2000,
  });

  return response.choices[0]?.message?.content || '';
}

export async function* generateStream(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; maxTokens?: number },
): AsyncGenerator<string> {
  const stream = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20),
    ],
    temperature: options?.temperature ?? 0.5,
    max_tokens: options?.maxTokens ?? 1500,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export function parseJsonResponse<T>(raw: string): T | null {
  try {
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error('[AI] Failed to parse JSON response:', e);
    return null;
  }
}
