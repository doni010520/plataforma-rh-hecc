'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const phrases = [
  'Posso gerar insights com IA ✨',
  'Analiso riscos da sua equipe 📊',
  'Precisa de um relatório? 📋',
  'Identifico tendências para você 🔍',
  'Pergunte-me qualquer coisa! 💬',
];

// Sprite sheet config: 3400x1600px image, 17 cols x 8 rows, 200x200 per frame
const COLS = 17;
const TOTAL_FRAMES = 136;
const FPS = 17;
const DISPLAY = 100; // rendered size px

export function AiRobot({ onClick }: { onClick: () => void }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load sprite image once and animate with canvas (handles transparency properly)
  useEffect(() => {
    const img = new Image();
    img.src = '/robot_sprite.png';
    imgRef.current = img;

    let animId: number;
    let lastTime = 0;
    const frameDuration = 1000 / FPS;

    const animate = (time: number) => {
      if (time - lastTime >= frameDuration) {
        lastTime = time;
        frameRef.current = (frameRef.current + 1) % TOTAL_FRAMES;
        const col = frameRef.current % COLS;
        const row = Math.floor(frameRef.current / COLS);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas && imgRef.current?.complete) {
          ctx.clearRect(0, 0, DISPLAY, DISPLAY);
          // Draw only the current frame from the sprite sheet
          ctx.drawImage(
            imgRef.current,
            col * 200, // source x (in original 200px frames)
            row * 200, // source y
            200,        // source width
            200,        // source height
            0,          // dest x
            0,          // dest y
            DISPLAY,    // dest width (scaled to 80px)
            DISPLAY     // dest height
          );
        }
      }
      animId = requestAnimationFrame(animate);
    };

    img.onload = () => {
      animId = requestAnimationFrame(animate);
    };

    // If already cached
    if (img.complete) {
      animId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animId);
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

      {/* Animated sprite robot — canvas approach for proper transparency */}
      <button
        onClick={onClick}
        className="hover:scale-110 transition-transform duration-200 focus:outline-none"
        aria-label="Abrir agente IA"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.35))' }}
      >
        <canvas
          ref={canvasRef}
          width={DISPLAY}
          height={DISPLAY}
          className="pointer-events-none"
          style={{ width: DISPLAY, height: DISPLAY }}
        />
      </button>
    </div>
  );
}
