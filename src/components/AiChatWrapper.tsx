'use client';

import { AiChat } from '@/components/AiChat';

interface AiChatWrapperProps {
  userRole?: string;
}

export function AiChatWrapper({ userRole }: AiChatWrapperProps) {
  if (!userRole || userRole === 'EMPLOYEE') return null;

  return <AiChat />;
}
