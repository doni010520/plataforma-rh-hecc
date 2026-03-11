'use client';

import { useState, useEffect } from 'react';
import { AiChat } from '@/components/AiChat';

export function AiChatWrapper() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.role) setRole(data.role); })
      .catch(() => {});
  }, []);

  if (!role || role === 'EMPLOYEE') return null;

  return <AiChat />;
}
