import React from 'react';
import { CalendarEvent, eventTypeConfig, shortDayNames, formatTime, toDateStr, getEventDate } from './types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function timeToMinutes(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function eventTop(start: string | null): number {
  return (timeToMinutes(start) / 60) * 56;
}

function eventHeight(start: string | null, end: string | null): number {
  if (!start || !end) return 56;
  const mins = Math.max(30, timeToMinutes(end) - timeToMinutes(start));
  return (mins / 60) * 56;
}

interface WeekViewProps {
  weekStart: Date;
  events: CalendarEvent[];
  onDayClick: (dateStr: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ weekStart, events, onDayClick, onEventClick }) => {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getEventsForDay = (d: Date) => {
    const ds = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
    return events.filter(e => getEventDate(e) === ds);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <div className="w-14 flex-shrink-0" />
        {days.map((d, i) => {
          const ds = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
          const isToday = ds === todayStr;
          return (
            <div
              key={i}
              onClick={() => onDayClick(ds)}
              className="flex-1 py-2 text-center cursor-pointer hover:bg-gray-50 transition-colors duration-150 border-l border-gray-100"
            >
              <div className="text-xs text-gray-500">{shortDayNames[d.getDay()]}</div>
              <div className={`mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors duration-150 ${
                isToday ? 'bg-primary-700 text-white' : 'text-gray-800 hover:bg-gray-100'
              }`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-14 flex-shrink-0">
            {HOURS.map(h => (
              <div key={h} style={{ height: 56 }} className="border-b border-gray-100 pr-2 flex items-start justify-end pt-1">
                <span className="text-xs text-gray-400 leading-none">{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {days.map((d, di) => {
            const ds = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEvents = getEventsForDay(d);
            const isToday = ds === todayStr;
            return (
              <div
                key={di}
                className={`flex-1 relative border-l border-gray-100 ${isToday ? 'bg-blue-50/30' : ''}`}
                style={{ height: 56 * 24 }}
                onClick={() => onDayClick(ds)}
              >
                {HOURS.map(h => (
                  <div key={h} style={{ height: 56, top: h * 56 }} className="absolute w-full border-b border-gray-100" />
                ))}
                {dayEvents.map(event => {
                  const config = eventTypeConfig[event.type];
                  const top = eventTop(event.start_time);
                  const height = eventHeight(event.start_time, event.end_time);
                  return (
                    <div
                      key={event.id}
                      onClick={e => { e.stopPropagation(); onEventClick(event); }}
                      style={{ top, height, left: 2, right: 2, position: 'absolute' }}
                      className={`rounded px-1.5 py-1 cursor-pointer overflow-hidden border-l-2 ${config.bg} ${config.text} ${config.border} hover:opacity-80 transition-opacity duration-150`}
                    >
                      <div className="text-xs font-medium leading-tight truncate">{event.title}</div>
                      {event.start_time && (
                        <div className="text-xs opacity-75 leading-tight">
                          {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
