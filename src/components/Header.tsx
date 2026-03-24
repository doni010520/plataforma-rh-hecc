'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface HeaderProps {
  userName: string;
  avatarUrl?: string | null;
}

export function Header({ userName, avatarUrl }: HeaderProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchUnreadCount() {
    try {
      const res = await fetch('/api/notifications?count=true');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* ignore */ }
  }

  async function toggleDropdown() {
    if (!showDropdown) {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        setNotifications(await res.json());
      }
    }
    setShowDropdown(!showDropdown);
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PUT' });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleNotificationClick(notification: NotificationItem) {
    if (!notification.read) {
      await fetch(`/api/notifications/${notification.id}`, { method: 'PUT' });
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
    }
    setShowDropdown(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = userName || 'Usuário';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/70 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_12px_rgba(0,0,0,0.3)] flex items-center justify-between px-4 md:px-6 z-50 header-light">
      {/* Left side: hamburger (mobile) + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          className="md:hidden p-2 text-gray-400 hover:text-gray-100"
          aria-label="Abrir menu de navegação"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/feedflow-dark.svg" alt="FeedFlow" className="h-7 hidden md:block" />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 md:gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="relative p-2 text-gray-400 hover:text-gray-300 transition-colors"
            aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
            aria-expanded={showDropdown}
            aria-haspopup="true"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-gray-900/90 backdrop-blur-xl rounded-lg shadow-lg border border-emerald-500/10 max-h-96 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30">
                <h3 className="text-sm font-semibold text-gray-100">Notificações</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-emerald-400 hover:text-emerald-200 font-medium"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div className="overflow-y-auto max-h-72" role="list">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 text-center">Nenhuma notificação.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-800/50 border-b border-gray-700/20 transition-colors ${
                        !n.read ? 'bg-emerald-500/10' : ''
                      }`}
                      role="listitem"
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-green-700 flex-shrink-0 mt-1.5" aria-hidden="true" />
                        )}
                        <div className={!n.read ? '' : 'ml-4'}>
                          <p className="text-sm font-medium text-gray-100">{n.title}</p>
                          {n.body && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(n.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-gray-700/30">
                <Link
                  href="/notificacoes"
                  onClick={() => setShowDropdown(false)}
                  className="block text-center py-2.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium hover:bg-gray-800/50"
                >
                  Ver todas
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <Link href="/perfil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-sm text-gray-300 font-medium hidden sm:inline">{displayName}</span>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-800 text-emerald-200 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
          )}
        </Link>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          aria-label="Sair da conta"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
