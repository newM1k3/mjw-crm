import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, Activity, Mail, Phone, Clock, UserPlus, Hash, CalendarPlus } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';

interface ClientCounts {
  active: number;
  pending: number;
  inactive: number;
  total: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  location: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}

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
              cx="80"
              cy="80"
              r={radius}
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

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [clientCounts, setClientCounts] = useState<ClientCounts>({ active: 0, pending: 0, inactive: 0, total: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);
      const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

      const [clientsRes, eventsRes, eventsCountRes, activitiesRes, contactsRes] = await Promise.all([
        pb.collection('clients').getFullList({ filter: `user_id = \"${user.id}\"`, fields: 'status' }),
        pb
          .from('events')
          .select('id, title, date, time, type, location')
          .eq('user_id', user.id)
          .gte('date', todayStr)
          .lte('date', sevenDaysStr)
          .order('date', { ascending: true })
          .limit(5),
        pb
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('date', todayStr)
          .lte('date', sevenDaysStr),
        pb
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        pb.collection('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (clientsRes.data) {
        const counts = { active: 0, pending: 0, inactive: 0, total: clientsRes.data.length };
        clientsRes.data.forEach(c => {
          if (c.status === 'active') counts.active++;
          else if (c.status === 'pending') counts.pending++;
          else counts.inactive++;
        });
        setClientCounts(counts);
      }

      if (eventsRes.data) setUpcomingEvents(eventsRes.data as UpcomingEvent[]);
      if (eventsCountRes.count !== null) setUpcomingEventsCount(eventsCountRes.count);
      if (activitiesRes.data) setRecentActivities(activitiesRes.data as ActivityItem[]);
      if (contactsRes.count !== null) setContactCount(contactsRes.count);

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
        <h2 className="text-xl font-medium text-white">Dashboard</h2>
        <p className="text-sm text-blue-200 mt-0.5">Welcome back, {displayName}</p>
      </div>

      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Clients"
            value={clientCounts.total}
            icon={Users}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Active Clients"
            value={clientCounts.active}
            icon={TrendingUp}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            label="Total Contacts"
            value={contactCount}
            icon={Phone}
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
          />
          <StatCard
            label="Upcoming Events"
            value={upcomingEventsCount}
            icon={Calendar}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Clients by Status</h3>
              <p className="text-xs text-gray-500 mt-0.5">Distribution across all client statuses</p>
            </div>
            <div className="p-5">
              {clientCounts.total === 0 ? (
                <EmptyState icon={Users} message="No clients yet" sub="Add clients to see the status chart" />
              ) : (
                <StatusChart counts={clientCounts} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Upcoming Events</h3>
              <p className="text-xs text-gray-500 mt-0.5">Next 7 days</p>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingEvents.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon={Calendar} message="No upcoming events" sub="Schedule events in the Calendar section" />
                </div>
              ) : (
                upcomingEvents.map(event => {
                  const typeConf = eventTypeConfig[event.type] || eventTypeConfig.meeting;
                  return (
                    <div key={event.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex-shrink-0 text-center w-12">
                        <p className="text-xs font-medium text-primary-700">{formatEventDate(event.date)}</p>
                        {event.time && <p className="text-xs text-gray-400 mt-0.5">{event.time}</p>}
                      </div>
                      <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        {event.location && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{event.location}</p>
                        )}
                      </div>
                      <span className={`md-chip text-xs flex-shrink-0 ${typeConf.bg} ${typeConf.text}`}>
                        {event.type}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-xs text-gray-500 mt-0.5">Latest actions across your CRM</p>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivities.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Activity} message="No recent activity" sub="Activity will appear here as you use the CRM" />
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
                      <span>{formatRelativeTime(activity.created_at)}</span>
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

interface EmptyStateProps {
  icon: React.FC<{ className?: string }>;
  message: string;
  sub: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, message, sub }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-700">{message}</p>
    <p className="text-xs text-gray-400 mt-1">{sub}</p>
  </div>
);

export default DashboardPage;
