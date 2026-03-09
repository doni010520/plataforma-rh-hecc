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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        Como você está hoje?
      </h3>
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3, 4, 5].map((mood) => (
          <button
            key={mood}
            onClick={() => handleMoodSelect(mood)}
            disabled={saving}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              selectedMood === mood
                ? 'bg-indigo-50 ring-2 ring-indigo-500 scale-110'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className="text-3xl">{moodEmojis[mood]}</span>
            <span className="text-xs text-gray-500">{moodLabels[mood]}</span>
          </button>
        ))}
      </div>
      {saved && selectedMood && (
        <p className="text-center text-xs text-green-600 mt-2">
          Humor registado: {moodLabels[selectedMood]}
        </p>
      )}
    </div>
  );
}
