'use client';

import { useState, useRef, useEffect } from 'react';

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
      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-green-700/90 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-gray-700 flex items-center justify-center z-50 transition-all hover:scale-105"
          aria-label="Abrir assistente IA"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[500px] bg-gray-900/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-green-700/90 backdrop-blur-sm text-white rounded-t-2xl">
            <h3 className="font-medium text-sm">Assistente IA</h3>
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
