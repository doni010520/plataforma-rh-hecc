'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  FEEDBACK_RECEIVED: '💬',
  EVALUATION_PENDING: '📋',
  OKR_CHECKIN_OVERDUE: '🎯',
  SURVEY_ACTIVE: '📊',
  ANNOUNCEMENT_NEW: '📢',
  CELEBRATION_REACTION: '🎉',
  GENERAL: '🔔',
};

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    const params = filter === 'unread' ? '?unread=true' : '';
    const res = await fetch(`/api/notifications${params}`);
    if (res.ok) setNotifications(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      await fetch(`/api/notifications/${notification.id}`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-green-800/40 rounded animate-pulse" />
        <div className="h-64 bg-green-800/40 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Notificações</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-emerald-400 hover:text-emerald-200 font-medium"
          >
            Marcar todas como lidas ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-4 border-b border-green-800/30">
        <button
          onClick={() => setFilter('all')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-green-700 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'unread'
              ? 'border-green-700 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Não lidas
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm p-12 text-center">
          <p className="text-2xl mb-2">🔔</p>
          <p className="text-gray-400">
            {filter === 'unread'
              ? 'Nenhuma notificação não lida.'
              : 'Nenhuma notificação ainda.'}
          </p>
        </div>
      ) : (
        <div className="bg-green-950/50 backdrop-blur-lg rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left px-5 py-4 hover:bg-green-900/30 transition-colors ${
                !n.read ? 'bg-emerald-900/30/30' : ''
              }`}
              role="listitem"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0" aria-hidden="true">
                  {typeIcons[n.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-gray-100' : 'font-medium text-gray-300'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-green-700 flex-shrink-0" aria-label="Não lida" />
                    )}
                  </div>
                  {n.body && (
                    <p className="text-sm text-gray-400 mt-0.5">{n.body}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {n.link && (
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
