'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const phrases = [
  'Posso gerar insights com IA ✨',
  'Analiso riscos da sua equipe 📊',
  'Precisa de um relatório? 📋',
  'Identifico tendências para você 🔍',
  'Pergunte-me qualquer coisa! 💬',
];

// Sprite sheet config
const COLS = 17;
const ROWS = 8;
const TOTAL_FRAMES = 136;
const FRAME_W = 200; // original px per frame in the sprite
const FRAME_H = 200;
const FPS = 17;
const DISPLAY_SIZE = 80; // rendered size on screen

export function AiRobot({ onClick }: { onClick: () => void }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const spriteRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  // Sprite animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % TOTAL_FRAMES;
      const col = frameRef.current % COLS;
      const row = Math.floor(frameRef.current / COLS);
      if (spriteRef.current) {
        // Move the background so the correct frame is visible in the 80x80 window
        const bgX = -(col * DISPLAY_SIZE);
        const bgY = -(row * DISPLAY_SIZE);
        spriteRef.current.style.backgroundPosition = `${bgX}px ${bgY}px`;
      }
    }, 1000 / FPS);
    return () => clearInterval(interval);
  }, []);

  // Phrase rotation
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

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
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
            onClick={handleDismiss}
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

      {/* Animated sprite robot button */}
      <button
        onClick={onClick}
        className="group hover:scale-110 transition-all duration-200 focus:outline-none"
        aria-label="Abrir agente IA"
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: 'hidden',
          borderRadius: '50%',
          filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3))',
        }}
      >
        {/* Sprite layer — overflow:hidden on parent clips to 1 frame */}
        <div
          ref={spriteRef}
          className="pointer-events-none group-hover:brightness-110 transition-all duration-200"
          style={{
            width: DISPLAY_SIZE,
            height: DISPLAY_SIZE,
            backgroundImage: 'url(/robot_sprite.png)',
            // Scale entire sprite: 17 cols × 80px = 1360px wide, 8 rows × 80px = 640px tall
            backgroundSize: `${COLS * DISPLAY_SIZE}px ${ROWS * DISPLAY_SIZE}px`,
            backgroundPosition: '0px 0px',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </button>
    </div>
  );
}
