import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, User, Clock, MessageCircle, UserPlus, Hash, CalendarPlus, Activity } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}

const activityTypeConfig: Record<string, { icon: React.FC<{ className?: string }>; bg: string; color: string }> = {
  email: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600' },
  call: { icon: Phone, bg: 'bg-green-100', color: 'text-green-600' },
  meeting: { icon: Calendar, bg: 'bg-teal-100', color: 'text-teal-600' },
  note: { icon: MessageCircle, bg: 'bg-orange-100', color: 'text-orange-600' },
  client_added: { icon: UserPlus, bg: 'bg-blue-100', color: 'text-blue-600' },
  client_edited: { icon: UserPlus, bg: 'bg-teal-100', color: 'text-teal-600' },
  client_deleted: { icon: User, bg: 'bg-red-100', color: 'text-red-600' },
  contact_added: { icon: User, bg: 'bg-gray-100', color: 'text-gray-600' },
  tag_added: { icon: Hash, bg: 'bg-pink-100', color: 'text-pink-600' },
  event_added: { icon: CalendarPlus, bg: 'bg-teal-100', color: 'text-teal-600' },
};

const fallbackConfig = { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-600' };

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

const ActivityFeed: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const data = await pb.collection('activities').getList(1, 5, { filter: `user_id = '${user.id}'`, sort: '-created', fields: 'id, type, title, description, created_at' }).then(r => r.items).catch(() => []);
      setActivities((data as ActivityItem[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="w-72 bg-white border-l border-gray-200 h-full flex flex-col hidden xl:flex">
      <div className="bg-primary-700 px-5 py-4 flex-shrink-0">
        <h3 className="text-base font-medium text-white">Recent Activity</h3>
        <p className="text-xs text-blue-200 mt-0.5">Latest interactions</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No recent activity yet.</p>
            <p className="text-xs text-gray-400 mt-1">Actions you take will appear here.</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const config = activityTypeConfig[activity.type] || fallbackConfig;
            const Icon = config.icon;
            return (
              <div
                key={activity.id}
                className={`flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors duration-150 ${
                  index < activities.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug truncate">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{formatRelativeTime(activity.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
