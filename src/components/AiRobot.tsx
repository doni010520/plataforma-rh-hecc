'use client';

import { useState, useEffect } from 'react';

const phrases = [
  'Posso gerar insights com IA ✨',
  'Analiso riscos da sua equipe 📊',
  'Precisa de um relatório? 📋',
  'Identifico tendências para você 🔍',
  'Pergunte-me qualquer coisa! 💬',
];

export function AiRobot({ onClick }: { onClick: () => void }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowBubble(false);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setShowBubble(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-1">
      {/* Speech bubble */}
      {showBubble && !dismissed && (
        <div
          className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-medium rounded-xl px-4 py-2.5 shadow-lg border border-gray-200 dark:border-gray-700 max-w-[220px] animate-fade-in cursor-pointer"
          onClick={onClick}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center text-[10px] hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
          {phrases[phraseIndex]}
          {/* Bubble tail */}
          <div className="absolute -bottom-1.5 right-8 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45" />
        </div>
      )}

      {/* Animated robot GIF */}
      <button
        onClick={onClick}
        className="w-[72px] h-[72px] rounded-full hover:scale-110 transition-transform duration-200 focus:outline-none"
        aria-label="Abrir agente IA"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ai-robot.gif"
          alt="Agente IA FeedFlow"
          width={72}
          height={72}
          className="w-full h-full object-contain drop-shadow-lg"
        />
      </button>
    </div>
  );
}
