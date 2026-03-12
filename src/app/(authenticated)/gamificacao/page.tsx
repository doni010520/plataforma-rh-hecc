'use client';

import { useState, useEffect, useCallback } from 'react';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  totalPoints: number;
  rank: number;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointsRequired: number;
  createdAt: string;
  earned: boolean;
  _count: { userBadges: number };
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const BADGE_ICONS: Record<string, string> = {
  star: '\u2B50',
  trophy: '\uD83C\uDFC6',
  rocket: '\uD83D\uDE80',
  heart: '\u2764\uFE0F',
  fire: '\uD83D\uDD25',
  medal: '\uD83C\uDFC5',
  lightning: '\u26A1',
  diamond: '\uD83D\uDC8E',
  crown: '\uD83D\uDC51',
  target: '\uD83C\uDFAF',
};

const CATEGORY_LABELS: Record<string, string> = {
  ENGAGEMENT: 'Engajamento',
  PERFORMANCE: 'Performance',
  LEARNING: 'Aprendizado',
  COLLABORATION: 'Colaboracao',
  MILESTONE: 'Marco',
};

const CATEGORY_COLORS: Record<string, string> = {
  ENGAGEMENT: 'bg-blue-100 text-blue-700',
  PERFORMANCE: 'bg-purple-100 text-purple-700',
  LEARNING: 'bg-emerald-900/40 text-emerald-400',
  COLLABORATION: 'bg-orange-100 text-orange-700',
  MILESTONE: 'bg-pink-100 text-pink-700',
};

function getRankBadge(rank: number): string {
  if (rank === 1) return '\uD83E\uDD47';
  if (rank === 2) return '\uD83E\uDD48';
  if (rank === 3) return '\uD83E\uDD49';
  return `#${rank}`;
}

export default function GamificacaoPage() {
  const [tab, setTab] = useState<'leaderboard' | 'badges' | 'admin'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Award points form
  const [pointsUserId, setPointsUserId] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsSourceType, setPointsSourceType] = useState('');
  const [awardingPoints, setAwardingPoints] = useState(false);

  // Create badge form
  const [badgeName, setBadgeName] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeIcon, setBadgeIcon] = useState('star');
  const [badgeCategory, setBadgeCategory] = useState('ENGAGEMENT');
  const [badgePointsReq, setBadgePointsReq] = useState('');
  const [creatingBadge, setCreatingBadge] = useState(false);

  // Award badge form
  const [awardBadgeId, setAwardBadgeId] = useState('');
  const [awardBadgeUserId, setAwardBadgeUserId] = useState('');
  const [awardingBadge, setAwardingBadge] = useState(false);

  const isAdmin = userInfo?.role === 'ADMIN' || userInfo?.role === 'MANAGER';

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/gamificacao');
      if (res.ok) {
        const data = await res.json() as { leaderboard: LeaderboardEntry[]; currentUser: LeaderboardEntry | null };
        setLeaderboard(data.leaderboard);
        setCurrentUser(data.currentUser);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/gamificacao/badges');
      if (res.ok) {
        const data: BadgeItem[] = await res.json();
        setBadges(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchLeaderboard(),
      fetchBadges(),
      fetch('/api/me').then((r) => r.ok ? r.json() : null).then((data) => {
        if (data) setUserInfo({ id: data.id, name: data.name, role: data.role });
      }),
      fetch('/api/colaboradores').then((r) => r.ok ? r.json() : null).then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data.map((u: { id: string; name: string; email: string }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          })));
        }
      }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchLeaderboard, fetchBadges]);

  const handleAwardPoints = async () => {
    if (!pointsUserId || !pointsAmount || !pointsReason) return;
    setAwardingPoints(true);
    try {
      const res = await fetch('/api/gamificacao/pontos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pointsUserId,
          points: parseInt(pointsAmount, 10),
          reason: pointsReason,
          sourceType: pointsSourceType,
        }),
      });
      if (res.ok) {
        setPointsUserId('');
        setPointsAmount('');
        setPointsReason('');
        setPointsSourceType('');
        fetchLeaderboard();
      }
    } catch {
      // ignore
    } finally {
      setAwardingPoints(false);
    }
  };

  const handleCreateBadge = async () => {
    if (!badgeName.trim()) return;
    setCreatingBadge(true);
    try {
      const res = await fetch('/api/gamificacao/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: badgeName.trim(),
          description: badgeDesc,
          icon: badgeIcon,
          category: badgeCategory,
          pointsRequired: badgePointsReq ? parseInt(badgePointsReq, 10) : 0,
        }),
      });
      if (res.ok) {
        setBadgeName('');
        setBadgeDesc('');
        setBadgeIcon('star');
        setBadgeCategory('ENGAGEMENT');
        setBadgePointsReq('');
        fetchBadges();
      }
    } catch {
      // ignore
    } finally {
      setCreatingBadge(false);
    }
  };

  const handleAwardBadge = async () => {
    if (!awardBadgeId || !awardBadgeUserId) return;
    setAwardingBadge(true);
    try {
      const res = await fetch(`/api/gamificacao/badges/${awardBadgeId}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: awardBadgeUserId }),
      });
      if (res.ok) {
        setAwardBadgeId('');
        setAwardBadgeUserId('');
        fetchBadges();
      }
    } catch {
      // ignore
    } finally {
      setAwardingBadge(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-green-800/40 rounded w-48" />
          <div className="h-64 bg-green-800/40 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Gamificacao</h1>
        <p className="text-sm text-gray-400 mt-1">Pontos, badges e ranking dos colaboradores</p>
      </div>

      {/* My Profile Card */}
      {currentUser && (
        <div className="bg-gradient-to-r from-green-600 to-purple-600 rounded-xl p-5 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Seu ranking</p>
              <p className="text-3xl font-bold">{getRankBadge(currentUser.rank)}</p>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm">Total de pontos</p>
              <p className="text-3xl font-bold">{currentUser.totalPoints.toLocaleString('pt-BR')}</p>
            </div>
          </div>
          {badges.filter((b) => b.earned).length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-green-100 text-xs mb-2">Seus badges</p>
              <div className="flex flex-wrap gap-2">
                {badges.filter((b) => b.earned).map((b) => (
                  <span
                    key={b.id}
                    className="bg-green-950/50 backdrop-blur-lg/20 backdrop-blur rounded-full px-3 py-1 text-sm"
                    title={b.name}
                  >
                    {BADGE_ICONS[b.icon] || BADGE_ICONS.star} {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-green-900/40 rounded-lg p-1">
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'leaderboard' ? 'bg-green-950/50 backdrop-blur-lg shadow text-gray-100' : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Ranking
        </button>
        <button
          onClick={() => setTab('badges')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'badges' ? 'bg-green-950/50 backdrop-blur-lg shadow text-gray-100' : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Badges
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('admin')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'admin' ? 'bg-green-950/50 backdrop-blur-lg shadow text-gray-100' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Administrar
          </button>
        )}
      </div>

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30">
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Nenhum ponto registrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 ${
                    entry.userId === userInfo?.id ? 'bg-emerald-900/30' : ''
                  }`}
                >
                  <div className="w-10 text-center">
                    <span className={`text-lg font-bold ${
                      entry.rank <= 3 ? 'text-2xl' : 'text-gray-400'
                    }`}>
                      {getRankBadge(entry.rank)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {entry.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100 truncate">{entry.userName}</p>
                    {entry.jobTitle && (
                      <p className="text-xs text-gray-400 truncate">{entry.jobTitle}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-100">{entry.totalPoints.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-gray-400">pontos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Badges Tab */}
      {tab === 'badges' && (
        <div>
          {badges.length === 0 ? (
            <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-12 text-center text-gray-400">
              Nenhum badge criado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border-2 p-4 transition-all ${
                    badge.earned
                      ? 'border-green-300 shadow-green-100'
                      : 'border-green-800/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      badge.earned ? 'bg-emerald-900/40' : 'bg-green-900/40'
                    }`}>
                      {BADGE_ICONS[badge.icon] || BADGE_ICONS.star}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-100 truncate">{badge.name}</h3>
                      {badge.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{badge.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[badge.category] || 'bg-green-900/40 text-gray-300'}`}>
                      {CATEGORY_LABELS[badge.category] || badge.category}
                    </span>
                    {badge.earned ? (
                      <span className="text-xs font-medium text-green-600">Conquistado</span>
                    ) : (
                      badge.pointsRequired > 0 && (
                        <span className="text-xs text-gray-400">{badge.pointsRequired} pts</span>
                      )
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {badge._count.userBadges} colaborador{badge._count.userBadges !== 1 ? 'es' : ''} conquistou
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Tab */}
      {tab === 'admin' && isAdmin && (
        <div className="space-y-6">
          {/* Award Points */}
          <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-5">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Atribuir Pontos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <select
                value={pointsUserId}
                onChange={(e) => setPointsUserId(e.target.value)}
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Selecione o colaborador</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                placeholder="Quantidade de pontos"
                min="1"
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={pointsReason}
                onChange={(e) => setPointsReason(e.target.value)}
                placeholder="Motivo"
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="text"
                value={pointsSourceType}
                onChange={(e) => setPointsSourceType(e.target.value)}
                placeholder="Tipo (ex: feedback_given, survey_completed)"
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleAwardPoints}
              disabled={awardingPoints || !pointsUserId || !pointsAmount || !pointsReason}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm font-medium"
            >
              {awardingPoints ? 'Atribuindo...' : 'Atribuir Pontos'}
            </button>
          </div>

          {/* Create Badge */}
          <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-5">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Criar Badge</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={badgeName}
                onChange={(e) => setBadgeName(e.target.value)}
                placeholder="Nome do badge"
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="text"
                value={badgeDesc}
                onChange={(e) => setBadgeDesc(e.target.value)}
                placeholder="Descricao"
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <select
                value={badgeIcon}
                onChange={(e) => setBadgeIcon(e.target.value)}
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Object.entries(BADGE_ICONS).map(([key, emoji]) => (
                  <option key={key} value={key}>{emoji} {key}</option>
                ))}
              </select>
              <select
                value={badgeCategory}
                onChange={(e) => setBadgeCategory(e.target.value)}
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                type="number"
                value={badgePointsReq}
                onChange={(e) => setBadgePointsReq(e.target.value)}
                placeholder="Pontos necessarios"
                min="0"
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleCreateBadge}
              disabled={creatingBadge || !badgeName.trim()}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm font-medium"
            >
              {creatingBadge ? 'Criando...' : 'Criar Badge'}
            </button>
          </div>

          {/* Award Badge */}
          <div className="bg-green-950/50 backdrop-blur-lg rounded-xl shadow-sm border border-green-800/30 p-5">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Conceder Badge</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <select
                value={awardBadgeId}
                onChange={(e) => setAwardBadgeId(e.target.value)}
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Selecione o badge</option>
                {badges.map((b) => (
                  <option key={b.id} value={b.id}>
                    {BADGE_ICONS[b.icon] || BADGE_ICONS.star} {b.name}
                  </option>
                ))}
              </select>
              <select
                value={awardBadgeUserId}
                onChange={(e) => setAwardBadgeUserId(e.target.value)}
                className="border border-green-700/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Selecione o colaborador</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAwardBadge}
              disabled={awardingBadge || !awardBadgeId || !awardBadgeUserId}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm font-medium"
            >
              {awardingBadge ? 'Concedendo...' : 'Conceder Badge'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
