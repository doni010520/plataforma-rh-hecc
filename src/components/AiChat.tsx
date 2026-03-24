'use client';

import { useState, useRef, useEffect } from 'react';
import { AiRobot } from './AiRobot';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatProps {
  inline?: boolean;
  departmentId?: string;
}

export function AiChat({ inline, departmentId }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(inline ?? false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: departmentId ? { departmentId } : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Erro ao conectar com a IA. Verifique se a chave da API está configurada.',
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + parsed.content,
                };
                return updated;
              });
            }
          } catch {
            // ignore parse errors for partial chunks
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Erro de conexão. Tente novamente.',
        };
        return updated;
      });
    }

    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Inline mode: render directly
  if (inline) {
    return (
      <div className="flex flex-col h-[600px] bg-gray-900/50 backdrop-blur-lg border rounded-lg">
        <ChatHeader onClear={() => setMessages([])} />
        <ChatMessages messages={messages} isStreaming={isStreaming} messagesEndRef={messagesEndRef} />
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          onKeyDown={handleKeyDown}
          isStreaming={isStreaming}
        />
      </div>
    );
  }

  // Floating mode
  return (
    <>
      {/* Animated AI Robot FAB */}
      {!isOpen && (
        <AiRobot onClick={() => setIsOpen(true)} />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[500px] bg-gray-900/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-emerald-600 backdrop-blur-sm text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a1 1 0 011 1v2h-2V3a1 1 0 011-1zM8.5 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 16h6M4 8h16a2 2 0 012 2v6a2 2 0 01-2 2h-1l-1 4H6l-1-4H4a2 2 0 01-2-2v-6a2 2 0 012-2z" />
              </svg>
              <h3 className="font-medium text-sm">Agente IA FeedFlow</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMessages([])} className="text-green-200 hover:text-white text-xs">Limpar</button>
              <button onClick={() => setIsOpen(false)} className="text-green-200 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <ChatMessages messages={messages} isStreaming={isStreaming} messagesEndRef={messagesEndRef} />
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={sendMessage}
            onKeyDown={handleKeyDown}
            isStreaming={isStreaming}
          />
        </div>
      )}
    </>
  );
}

function ChatHeader({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-green-700 text-white rounded-t-lg">
      <h3 className="font-medium text-sm">Assistente IA</h3>
      <button onClick={onClear} className="text-green-200 hover:text-white text-xs">Limpar conversa</button>
    </div>
  );
}

function ChatMessages({
  messages,
  isStreaming,
  messagesEndRef,
}: {
  messages: Message[];
  isStreaming: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && (
        <div className="text-center text-gray-400 text-sm mt-8">
          <p className="font-medium mb-2">Olá! Sou o Assistente IA.</p>
          <p>Pergunte sobre sua equipe, performance, engajamento ou qualquer dado de RH.</p>
        </div>
      )}
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-emerald-900/40 text-green-900'
                : 'bg-gray-800/40 text-gray-100'
            }`}
          >
            {msg.content || (isStreaming && i === messages.length - 1 ? (
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            ) : '')}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
    </div>
  );
}

function ChatInput({
  input,
  setInput,
  onSend,
  onKeyDown,
  isStreaming,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="border-t p-3 flex gap-2">
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Digite sua pergunta..."
        rows={1}
        className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
        disabled={isStreaming}
      />
      <button
        onClick={onSend}
        disabled={isStreaming || !input.trim()}
        className="px-3 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  );
}
