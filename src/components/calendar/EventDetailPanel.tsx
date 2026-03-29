import React from 'react';
import { X, Calendar, Clock, MapPin, FileText, Link, User, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { CalendarEvent, eventTypeConfig, formatTime } from './types';

interface EventDetailPanelProps {
  event: CalendarEvent | null;
  clientName: string | null;
  contactName: string | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}

const formatDisplayDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  event,
  clientName,
  contactName,
  onClose,
  onEdit,
  onDelete,
}) => {
  const config = event ? eventTypeConfig[event.type] : null;

  return (
    <>
      {event && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div className={`fixed right-0 top-0 w-full sm:w-80 bg-white h-screen flex flex-col transform transition-transform duration-300 ease-in-out z-50 md-elevation-3 ${
        event ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {event && config && (
          <>
            <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-blue-200">Event Details</span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <span className={`text-lg ${config.text}`}>
                    {event.type === 'meeting' ? '📅' : event.type === 'call' ? '📞' : event.type === 'deadline' ? '⏰' : '🔔'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-medium text-white leading-snug">{event.title}</h2>
                  <span className={`inline-block mt-1.5 md-chip ${config.bg} ${config.text} capitalize`}>
                    {event.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Event Info</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(event)}
                      title="Edit event"
                      className="p-1.5 rounded text-gray-400 hover:text-primary-700 hover:bg-primary-50 transition-colors duration-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(event)}
                      title="Delete event"
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{formatDisplayDate(event.date)}</span>
                  </div>
                  {(event.start_time || event.end_time) && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {event.start_time ? formatTime(event.start_time) : ''}
                        {event.start_time && event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
                        {!event.start_time && event.end_time ? `Until ${formatTime(event.end_time)}` : ''}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{event.location}</span>
                    </div>
                  )}
                  {event.description && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {(clientName || contactName) && (
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Associations</h3>
                  <div className="space-y-2.5">
                    {clientName && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary-50">
                        <Link className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary-500 font-medium uppercase tracking-wide">Client</p>
                          <p className="text-sm text-primary-700 font-medium truncate">{clientName}</p>
                        </div>
                      </div>
                    )}
                    {contactName && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                        <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Contact</p>
                          <p className="text-sm text-gray-700 font-medium truncate">{contactName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="px-6 py-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onEdit(event)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded border border-gray-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors duration-200"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Event
                  </button>
                  <button
                    onClick={() => onDelete(event)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded border border-red-100 hover:bg-red-50 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default EventDetailPanel;
