import React from 'react';
import { Mail, Calendar, User, CheckCircle, ChevronRight } from 'lucide-react';
import type { PriorityItem } from '../../lib/priorities';

// ─── Badge color map ──────────────────────────────────────────────────────────

const badgeStyles: Record<string, string> = {
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-600',
};

// ─── Action config ────────────────────────────────────────────────────────────

const actionConfig: Record<string, { icon: React.FC<{ className?: string }>; color: string }> = {
  'Send Email': { icon: Mail, color: 'text-primary-700 hover:bg-primary-50' },
  'View Calendar': { icon: Calendar, color: 'text-primary-700 hover:bg-primary-50' },
  'View Client': { icon: User, color: 'text-primary-700 hover:bg-primary-50' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrioritiesCardProps {
  priorities: PriorityItem[];
  loading: boolean;
  onEmailClient: (email: string) => void;
  onNavigate: (section: string) => void;
  onViewClient: (clientId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PrioritiesCard: React.FC<PrioritiesCardProps> = ({
  priorities,
  loading,
  onEmailClient,
  onNavigate,
  onViewClient,
}) => {
  const handleAction = (item: PriorityItem) => {
    switch (item.action) {
      case 'Send Email':
        onEmailClient(item.clientEmail);
        break;
      case 'View Calendar':
        onNavigate('calendar');
        break;
      case 'View Client':
        onViewClient(item.clientId);
        break;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Today's Priorities</h3>
            {!loading && priorities.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                {priorities.length}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Action items that need your attention</p>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : priorities.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">You're all caught up</p>
          <p className="text-xs text-gray-500 mt-1">No action items right now — nice work!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {priorities.map((item) => {
            const badge = badgeStyles[item.badgeColor] || badgeStyles.gray;
            const action = actionConfig[item.action] || actionConfig['View Client'];
            const ActionIcon = action.icon;

            return (
              <div
                key={item.clientId}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors duration-150"
              >
                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.clientName}</p>
                    {item.company && (
                      <span className="text-xs text-gray-400 truncate hidden sm:inline">
                        {item.company}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.reason}</p>
                </div>

                {/* Badge */}
                <span
                  className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium ${badge}`}
                >
                  {item.badge}
                </span>

                {/* Action button */}
                <button
                  onClick={() => handleAction(item)}
                  className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors duration-150 ${action.color}`}
                >
                  <ActionIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.action}</span>
                  <ChevronRight className="w-3 h-3 sm:hidden" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PrioritiesCard;
