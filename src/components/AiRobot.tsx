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
  const [dismissed, setDismisseld] = useState(false);

  useEffect(() => {
    // Rotate phrases every 4s
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Speech bubble */}
      {showBubble && !dismissed && (
        <div
          className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-medium rounded-xl px-4 py-2.5 shadow-lg border border-gray-200 dark:border-gray-700 max-w-[220px] animate-fade-in cursor-pointer"
          onClick={onClick}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setDismisseld(true); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center text-[10px] hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
          {phrases[phraseIndex]}
          {/* Bubble tail */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45" />
        </div>
      )}

      {/* Robot character */}
      <button
        onClick={onClick}
        className="relative w-16 h-16 group"
        aria-label="Abrir agente IA"
      >
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full drop-shadow-lg animate-float"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Antenna */}
          <line x1="50" y1="12" x2="50" y2="24" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="9" r="5" className="fill-emerald-400 animate-antenna-pulse" />

          {/* Head */}
          <rect x="22" y="24" width="56" height="42" rx="12" className="fill-emerald-600 group-hover:fill-emerald-500 transition-colors" />

          {/* Eyes */}
          <g className="animate-blink">
            <circle cx="38" cy="42" r="6" fill="white" />
            <circle cx="62" cy="42" r="6" fill="white" />
            <circle cx="39.5" cy="42" r="3" fill="#1f2937" />
            <circle cx="63.5" cy="42" r="3" fill="#1f2937" />
            {/* Eye shine */}
            <circle cx="41" cy="40.5" r="1.2" fill="white" opacity="0.8" />
            <circle cx="65" cy="40.5" r="1.2" fill="white" opacity="0.8" />
          </g>

          {/* Smile */}
          <path d="M 38 54 Q 50 62 62 54" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

          {/* Body */}
          <rect x="28" y="70" width="44" height="28" rx="8" className="fill-emerald-700 group-hover:fill-emerald-600 transition-colors" />

          {/* Chest light */}
          <circle cx="50" cy="82" r="4" className="fill-emerald-300 animate-chest-glow" />

          {/* Arms */}
          <rect x="10" y="74" width="14" height="8" rx="4" className="fill-emerald-600 animate-wave-left" style={{ transformOrigin: '24px 78px' }} />
          <rect x="76" y="74" width="14" height="8" rx="4" className="fill-emerald-600 animate-wave-right" style={{ transformOrigin: '76px 78px' }} />

          {/* Feet */}
          <rect x="32" y="100" width="14" height="8" rx="4" className="fill-emerald-800" />
          <rect x="54" y="100" width="14" height="8" rx="4" className="fill-emerald-800" />
        </svg>
      </button>
    </div>
  );
}
