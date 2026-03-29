import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CalendarEvent, eventTypeConfig, monthNames, shortDayNames, formatTime, toDateStr } from './calendar/types';
import EventModal from './calendar/EventModal';
import EventDetailPanel from './calendar/EventDetailPanel';
import WeekView from './calendar/WeekView';
import DayView from './calendar/DayView';

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    if (!error && data) setEvents(data as CalendarEvent[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('clients').select('id, name, company').eq('user_id', user.id),
      supabase.from('contacts').select('id, name').eq('user_id', user.id),
    ]).then(([{ data: cl }, { data: co }]) => {
      if (cl) {
        const map: Record<string, string> = {};
        (cl as { id: string; name: string; company: string }[]).forEach(c => {
          map[c.id] = c.company ? `${c.name} — ${c.company}` : c.name;
        });
        setClientNames(map);
      }
      if (co) setContactNames(Object.fromEntries((co as { id: string; name: string }[]).map(c => [c.id, c.name])));
    });
  }, [user]);

  const handleSaved = (event: CalendarEvent) => {
    setEvents(prev => {
      const exists = prev.find(e => e.id === event.id);
      const next = exists ? prev.map(e => e.id === event.id ? event : e) : [...prev, event];
      return next.sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleDeleted = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (detailEvent?.id === eventId) setDetailEvent(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEvent) return;
    setDeleting(true);
    await supabase.from('events').delete().eq('id', deleteConfirmEvent.id);
    setDeleting(false);
    handleDeleted(deleteConfirmEvent.id);
    setDeleteConfirmEvent(null);
  };

  const openNewEvent = (dateStr?: string) => {
    setDetailEvent(null);
    setEditingEvent(null);
    setModalInitialDate(dateStr || '');
    setModalOpen(true);
  };

  const openDetailPanel = (event: CalendarEvent) => {
    setDetailEvent(event);
  };

  const openEditFromDetail = (event: CalendarEvent) => {
    setDetailEvent(null);
    setEditingEvent(event);
    setModalInitialDate('');
    setModalOpen(true);
  };

  const openDeleteFromDetail = (event: CalendarEvent) => {
    setDetailEvent(null);
    setDeleteConfirmEvent(event);
  };

  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(currentDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1));
    } else if (view === 'week') {
      d.setDate(d.getDate() + (dir === 'prev' ? -7 : 7));
    } else {
      d.setDate(d.getDate() + (dir === 'prev' ? -1 : 1));
    }
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const getWeekStart = (d: Date) => {
    const s = new Date(d);
    s.setDate(d.getDate() - d.getDay());
    return s;
  };

  const headerLabel = () => {
    if (view === 'month') return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${monthNames[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      }
      return `${monthNames[ws.getMonth()]} ${ws.getDate()} – ${monthNames[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
    }
    return `${shortDayNames[currentDate.getDay()]}, ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const getEventsForDate = (day: number) => {
    const ds = toDateStr(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(e => e.date === ds);
  };

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);
  const sevenDaysStr = toDateStr(sevenDaysLater.getFullYear(), sevenDaysLater.getMonth(), sevenDaysLater.getDate());

  const isToday = (day: number) =>
    toDateStr(currentDate.getFullYear(), currentDate.getMonth(), day) === todayStr;

  const upcomingEvents = events.filter(e => e.date >= todayStr && e.date <= sevenDaysStr);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="bg-primary-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-white">Calendar</h2>
            <p className="text-sm text-blue-200 mt-0.5">Schedule and appointments</p>
          </div>
          <button
            onClick={() => openNewEvent()}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 text-sm font-medium rounded hover:bg-blue-50 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Event</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors duration-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900 min-w-[160px] text-center">{headerLabel()}</h3>
          <button
            onClick={() => navigate('next')}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors duration-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToday}
            className="ml-1 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
          >
            Today
          </button>
        </div>
        <div className="flex rounded overflow-hidden border border-gray-300">
          {(['month', 'week', 'day'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors duration-200 capitalize ${
                view === v ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : view === 'month' ? (
            <div className="h-full overflow-auto p-4">
              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {shortDayNames.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {getDaysInMonth().map((day, i) => (
                    <div
                      key={i}
                      onClick={() => day && openNewEvent(toDateStr(currentDate.getFullYear(), currentDate.getMonth(), day))}
                      className={`min-h-[90px] sm:min-h-[110px] p-1.5 border-r border-b border-gray-100 last:border-r-0 ${
                        day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50/50'
                      }`}
                    >
                      {day && (
                        <>
                          <div className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1 ${
                            isToday(day) ? 'bg-primary-700 text-white' : 'text-gray-700'
                          }`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {getEventsForDate(day).slice(0, 3).map(event => {
                              const config = eventTypeConfig[event.type];
                              return (
                                <div
                                  key={event.id}
                                  onClick={e => { e.stopPropagation(); openDetailPanel(event); }}
                                  className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium truncate cursor-pointer ${config.bg} ${config.text} hover:opacity-80 transition-opacity`}
                                  title={event.title}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
                                  <span className="truncate">{event.title}</span>
                                </div>
                              );
                            })}
                            {getEventsForDate(day).length > 3 && (
                              <div className="hidden sm:block text-xs text-gray-400 px-1">
                                +{getEventsForDate(day).length - 3} more
                              </div>
                            )}
                            {getEventsForDate(day).length > 0 && (
                              <div className={`sm:hidden w-2 h-2 rounded-full ${eventTypeConfig[getEventsForDate(day)[0].type].dot}`} />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="h-full overflow-hidden">
              <WeekView
                weekStart={getWeekStart(currentDate)}
                events={events}
                onDayClick={ds => { setCurrentDate(new Date(ds + 'T12:00:00')); setView('day'); }}
                onEventClick={openDetailPanel}
              />
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <DayView
                currentDate={currentDate}
                events={events}
                onHourClick={(ds, _hour) => openNewEvent(ds)}
                onEventClick={openDetailPanel}
              />
            </div>
          )}
        </div>

        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Upcoming Events</h3>
              <p className="text-xs text-gray-400 mt-0.5">Next 7 days</p>
            </div>
            {upcomingEvents.length > 0 && (
              <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                {upcomingEvents.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingEvents.map(event => {
              const config = eventTypeConfig[event.type];
              const clientName = event.client_id ? clientNames[event.client_id] : null;
              const contactName = event.contact_id ? contactNames[event.contact_id] : null;
              return (
                <div
                  key={event.id}
                  onClick={() => openDetailPanel(event)}
                  className="px-5 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 leading-snug flex-1">{event.title}</h4>
                    <span className={`md-chip ${config.bg} ${config.text} flex-shrink-0 capitalize`}>{event.type}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span>{event.date}</span>
                      {event.start_time && (
                        <span>· {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {clientName && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Link className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{clientName}</span>
                      </div>
                    )}
                    {contactName && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{contactName}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div className="px-5 py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No upcoming events</p>
                <button
                  onClick={() => openNewEvent()}
                  className="mt-3 text-xs text-primary-700 font-medium hover:underline"
                >
                  Create one
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <EventDetailPanel
        event={detailEvent}
        clientName={detailEvent?.client_id ? (clientNames[detailEvent.client_id] ?? null) : null}
        contactName={detailEvent?.contact_id ? (contactNames[detailEvent.contact_id] ?? null) : null}
        onClose={() => setDetailEvent(null)}
        onEdit={openEditFromDetail}
        onDelete={openDeleteFromDetail}
      />

      <EventModal
        isOpen={modalOpen}
        initialDate={modalInitialDate}
        event={editingEvent}
        onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      {deleteConfirmEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Delete Event</h3>
                  <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-6">
                Are you sure you want to delete <span className="font-semibold">{deleteConfirmEvent.title}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmEvent(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors duration-200 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
