import { NextRequest } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { generateStream, SYSTEM_PROMPT_CHAT } from '@/lib/ai';
import { collectChatContext } from '@/lib/ai-data-collector';

export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (user.role === 'EMPLOYEE') {
    return new Response(JSON.stringify({ error: 'Sem permissão.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { messages, context, summary } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    context?: { departmentId?: string };
    summary?: string;
  };

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Mensagens são obrigatórias.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const contextData = await collectChatContext(user.companyId, context);
    const summaryBlock = summary ? `\n\n--- RESUMO DE CONVERSAS ANTERIORES ---\n${summary}` : '';
    const fullSystemPrompt = `${SYSTEM_PROMPT_CHAT}\n\n--- DADOS DA EMPRESA ---\n${contextData}${summaryBlock}`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generateStream(fullSystemPrompt, messages)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`),
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('[AI Chat] Streaming error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Erro na geração da resposta.' })}\n\n`),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao iniciar chat.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
