import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Calendar, TrendingUp, Activity, Mail, Phone, Clock,
  UserPlus, Hash, CalendarPlus, RefreshCw,
} from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import {
  EmptyState, PermissionDenied, TimedOut, FetchError,
} from './ui/FetchState';
import { formatTime } from './calendar/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientCounts {
  active: number;
  pending: number;
  inactive: number;
  total: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  type: string;
  location: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  created: string;
}

type DashStatus = 'loading' | 'forbidden' | 'timeout' | 'error' | 'success';

// ─── Config maps ──────────────────────────────────────────────────────────────

const eventTypeConfig: Record<string, { bg: string; text: string; dot: string }> = {
  meeting: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  call: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  deadline: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  reminder: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const activityTypeConfig: Record<string, { icon: React.FC<{ className?: string }>; bg: string; color: string }> = {
  email: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600' },
  call: { icon: Phone, bg: 'bg-green-100', color: 'text-green-600' },
  meeting: { icon: Calendar, bg: 'bg-teal-100', color: 'text-teal-600' },
  note: { icon: Activity, bg: 'bg-orange-100', color: 'text-orange-600' },
  client_added: { icon: UserPlus, bg: 'bg-primary-100', color: 'text-primary-700' },
  contact_added: { icon: UserPlus, bg: 'bg-gray-100', color: 'text-gray-600' },
  tag_added: { icon: Hash, bg: 'bg-pink-100', color: 'text-pink-600' },
  event_added: { icon: CalendarPlus, bg: 'bg-teal-100', color: 'text-teal-600' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 10_000;

const formatRelativeTime = (isoString: string): string => {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
};

const formatEventDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// ─── StatusChart ──────────────────────────────────────────────────────────────

const StatusChart: React.FC<{ counts: ClientCounts }> = ({ counts }) => {
  const total = counts.total || 1;
  const segments = [
    { label: 'Active', count: counts.active, color: '#16a34a', light: '#dcfce7', text: 'text-green-700' },
    { label: 'Pending', count: counts.pending, color: '#ea580c', light: '#ffedd5', text: 'text-orange-700' },
    { label: 'Inactive', count: counts.inactive, color: '#9ca3af', light: '#f3f4f6', text: 'text-gray-600' },
  ];

  let cumulativePercent = 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const arcs = segments.map(seg => {
    const pct = seg.count / total;
    const offset = circumference * (1 - cumulativePercent);
    const dash = circumference * pct;
    const result = { ...seg, pct, dash, offset };
    cumulativePercent += pct;
    return result;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="20" />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="20"
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={arc.offset}
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-gray-900">{counts.total}</span>
          <span className="text-xs text-gray-500">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-sm text-gray-700">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }}
                />
              </div>
              <span className={`text-sm font-semibold w-6 text-right ${seg.text}`}>{seg.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow duration-200">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{label}</p>
    </div>
  </div>
);

// ─── DashboardPage ────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  // Gate on both `user` AND `loading` — if loading is still true, auth has not
  // been confirmed yet and we must not attempt any PocketBase fetches.
  const { user, loading: authLoading } = useAuth();

  const [clientCounts, setClientCounts] = useState<ClientCounts>({ active: 0, pending: 0, inactive: 0, total: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [status, setStatus] = useState<DashStatus>('loading');

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setStatus('loading');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    try {
      // Race all five queries against a 10-second timeout.
      // PocketBase v0.21: getFullList() returns an array directly.
      // Use single-quoted filter values to prevent 400 Bad Request.
      const [clientsArr, eventsPage, eventsCountPage, activitiesPage, contactsPage] =
        await Promise.race([
          Promise.all([
            pb.collection('clients').getFullList({ filter: `user_id = '${user.id}'`, fields: 'status' }),
            pb.collection('events').getList(1, 5, { filter: `user_id = '${user.id}' && start_time >= '${todayStr} 00:00:00' && start_time <= '${sevenDaysStr} 23:59:59'`, sort: 'start_time' }),
            pb.collection('events').getList(1, 1, { filter: `user_id = '${user.id}' && start_time >= '${todayStr} 00:00:00' && start_time <= '${sevenDaysStr} 23:59:59'` }),
            pb.collection('activities').getList(1, 5, { filter: `user_id = '${user.id}'`, sort: '-created' }),
            pb.collection('contacts').getList(1, 1, { filter: `user_id = '${user.id}'` }),
          ]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('__TIMEOUT__')), TIMEOUT_MS)
          ),
        ]);

      const counts = { active: 0, pending: 0, inactive: 0, total: clientsArr.length };
      (clientsArr as any[]).forEach((c: any) => {
        if (c.status === 'active') counts.active++;
        else if (c.status === 'pending') counts.pending++;
        else counts.inactive++;
      });
      setClientCounts(counts);

      if ((eventsPage as any)?.items) setUpcomingEvents((eventsPage as any).items as UpcomingEvent[]);
      if ((eventsCountPage as any)?.totalItems !== undefined) setUpcomingEventsCount((eventsCountPage as any).totalItems);
      if ((activitiesPage as any)?.items) setRecentActivities((activitiesPage as any).items as ActivityItem[]);
      if ((contactsPage as any)?.totalItems !== undefined) setContactCount((contactsPage as any).totalItems);

      setStatus('success');
    } catch (err: any) {
      if (err?.message === '__TIMEOUT__') {
        setStatus('timeout');
      } else if (err?.status === 403 || err?.status === 401) {
        setStatus('forbidden');
      } else {
        setStatus('error');
      }
    }
  }, [user]);

  // Only fetch once auth is confirmed (authLoading === false) and user is set.
  useEffect(() => {
    if (!authLoading && user) {
      fetchAll();
    }
  }, [authLoading, user, fetchAll]);

  // PocketBase stores user fields directly on the record, not under user_metadata.
  const displayName = (user as any)?.name || user?.email?.split('@')[0] || 'there';

  // ── Auth loading guard ────────────────────────────────────────────────────
  // Show a spinner while AuthContext is still confirming the token on mount.
  // This prevents the dashboard from attempting fetches before auth is ready.
  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
          <h2 className="text-xl font-medium text-white">Dashboard</h2>
          <p className="text-sm text-blue-200 mt-0.5">Loading…</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Full-page fetch states ────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
          <h2 className="text-xl font-medium text-white">Dashboard</h2>
          <p className="text-sm text-blue-200 mt-0.5">Welcome back, {displayName}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Loading your dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
          <h2 className="text-xl font-medium text-white">Dashboard</h2>
          <p className="text-sm text-blue-200 mt-0.5">Welcome back, {displayName}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <TimedOut onRetry={fetchAll} />
        </div>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
          <h2 className="text-xl font-medium text-white">Dashboard</h2>
          <p className="text-sm text-blue-200 mt-0.5">Welcome back, {displayName}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <PermissionDenied resource="your dashboard data" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
          <h2 className="text-xl font-medium text-white">Dashboard</h2>
          <p className="text-sm text-blue-200 mt-0.5">Welcome back, {displayName}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <FetchError
            message="Could not load dashboard data. Check your internet connection."
            onRetry={fetchAll}
          />
        </div>
      </div>
    );
  }

  // ── Success render ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-white">Dashboard</h2>
            <p className="text-sm text-blue-200 mt-0.5">Welcome back, {displayName}</p>
          </div>
          <button
            onClick={fetchAll}
            className="p-2 rounded text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Clients" value={clientCounts.total} icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" />
          <StatCard label="Active Clients" value={clientCounts.active} icon={TrendingUp} iconBg="bg-green-100" iconColor="text-green-600" />
          <StatCard label="Total Contacts" value={contactCount} icon={Phone} iconBg="bg-teal-100" iconColor="text-teal-600" />
          <StatCard label="Upcoming Events" value={upcomingEventsCount} icon={Calendar} iconBg="bg-orange-100" iconColor="text-orange-600" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client status chart */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Clients by Status</h3>
              <p className="text-xs text-gray-500 mt-0.5">Distribution across all client statuses</p>
            </div>
            <div className="p-5">
              {clientCounts.total === 0 ? (
                <EmptyState
                  icon={Users}
                  message="No clients yet"
                  sub="Add your first client to see the status chart."
                />
              ) : (
                <StatusChart counts={clientCounts} />
              )}
            </div>
          </div>

          {/* Upcoming events */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Upcoming Events</h3>
              <p className="text-xs text-gray-500 mt-0.5">Next 7 days</p>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingEvents.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={Calendar}
                    message="No upcoming events"
                    sub="Schedule events in the Calendar section."
                  />
                </div>
              ) : (
                upcomingEvents.map(event => {
                  const typeConf = eventTypeConfig[event.type] || eventTypeConfig.reminder;
                  return (
                    <div key={event.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex-shrink-0 text-center w-12">
                        <p className="text-xs font-medium text-primary-700">{formatEventDate(event.start_time ? event.start_time.slice(0, 10) : '')}</p>
                        {event.start_time && <p className="text-xs text-gray-400 mt-0.5">{formatTime(event.start_time)}</p>}
                      </div>
                      <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        {event.location && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{event.location}</p>
                        )}
                      </div>
                      <span className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-full font-medium ${typeConf.bg} ${typeConf.text}`}>
                        {event.type}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-xs text-gray-500 mt-0.5">Latest actions across your CRM</p>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivities.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Activity}
                  message="No recent activity"
                  sub="Activity will appear here as you use the CRM."
                />
              </div>
            ) : (
              recentActivities.map(activity => {
                const conf = activityTypeConfig[activity.type] || activityTypeConfig.note;
                const Icon = conf.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${conf.bg}`}>
                      <Icon className={`w-4 h-4 ${conf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{activity.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-xs text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(activity.created)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
