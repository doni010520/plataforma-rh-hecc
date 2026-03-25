import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

const MAX_RECENT_MESSAGES = 20;

// Ensure table exists (runs once, then cached by DB)
async function ensureMemoryTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]',
        summary TEXT DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
  } catch {
    // Table likely already exists
  }
}

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface ConversationRow {
  messages: StoredMessage[];
  summary: string;
}

// GET: load conversation for current user
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  await ensureMemoryTable();

  try {
    const rows = await prisma.$queryRaw<ConversationRow[]>`
      SELECT messages, summary FROM ai_conversations WHERE user_id = ${user.id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ messages: [], summary: '' });
    }

    const { messages, summary } = rows[0];
    // Return only the last N messages
    const recent = Array.isArray(messages) ? messages.slice(-MAX_RECENT_MESSAGES) : [];

    return NextResponse.json({ messages: recent, summary: summary || '' });
  } catch {
    return NextResponse.json({ messages: [], summary: '' });
  }
}

// PUT: save conversation for current user
export async function PUT(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  if (user.role === 'EMPLOYEE') return forbiddenResponse();

  await ensureMemoryTable();

  try {
    const { messages, summary } = await request.json() as {
      messages: StoredMessage[];
      summary?: string;
    };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensagens inválidas.' }, { status: 400 });
    }

    const messagesJson = JSON.stringify(messages);
    const summaryText = summary || '';

    // Upsert: insert or update
    await prisma.$executeRaw`
      INSERT INTO ai_conversations (user_id, messages, summary, updated_at)
      VALUES (${user.id}, ${messagesJson}::jsonb, ${summaryText}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET messages = ${messagesJson}::jsonb, summary = ${summaryText}, updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[AI Memory] Save error:', err);
    return NextResponse.json({ error: 'Erro ao salvar conversa.' }, { status: 500 });
  }
}

// DELETE: clear conversation
export async function DELETE() {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  await ensureMemoryTable();

  try {
    await prisma.$executeRaw`
      DELETE FROM ai_conversations WHERE user_id = ${user.id}
    `;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao limpar conversa.' }, { status: 500 });
  }
}
