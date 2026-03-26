'use client';

import { useState } from 'react';

const moodEmojis: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

const moodLabels: Record<number, string> = {
  1: 'Muito mal',
  2: 'Mal',
  3: 'Neutro',
  4: 'Bem',
  5: 'Muito bem',
};

interface MoodWidgetProps {
  initialMood: number | null;
}

export default function MoodWidget({ initialMood }: MoodWidgetProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(initialMood);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialMood);

  async function handleMoodSelect(mood: number) {
    setSelectedMood(mood);
    setSaving(true);

    const res = await fetch('/api/humor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800/70 border border-gray-200 dark:border-gray-600/30 backdrop-blur-lg rounded-xl shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Como você está hoje?
      </h3>
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3, 4, 5].map((mood) => (
          <button
            key={mood}
            onClick={() => handleMoodSelect(mood)}
            disabled={saving}
            className={`flex flex-col items-center justify-center gap-1.5 w-[72px] h-[80px] rounded-xl transition-all mood-card ${
              selectedMood === mood
                ? 'ring-2 ring-emerald-400 scale-105 mood-card-active'
                : 'hover:scale-105'
            }`}
          >
            <span className="text-2xl leading-none">{moodEmojis[mood]}</span>
            <span className="text-[11px] text-gray-400 font-medium">{moodLabels[mood]}</span>
          </button>
        ))}
      </div>
      {saved && selectedMood && (
        <p className="text-center text-xs text-green-600 mt-2">
          Humor registrado: {moodLabels[selectedMood]}
        </p>
      )}
    </div>
  );
}
