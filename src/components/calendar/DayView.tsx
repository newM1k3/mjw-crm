import React from 'react';
import { CalendarEvent, eventTypeConfig, dayNames, monthNames, formatTime, toDateStr, getEventDate } from './types';

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
  return (timeToMinutes(start) / 60) * 64;
}

function eventHeight(start: string | null, end: string | null): number {
  if (!start || !end) return 64;
  const mins = Math.max(30, timeToMinutes(end) - timeToMinutes(start));
  return (mins / 60) * 64;
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onHourClick: (dateStr: string, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const DayView: React.FC<DayViewProps> = ({ currentDate, events, onHourClick, onEventClick }) => {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStr = toDateStr(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const isToday = dateStr === todayStr;
  const dayEvents = events.filter(e => getEventDate(e) === dateStr);

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowTop = (nowMinutes / 60) * 64;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 py-3 px-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
            isToday ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            {currentDate.getDate()}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {dayNames[currentDate.getDay()]}
            </div>
            <div className="text-xs text-gray-500">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
          </div>
          {dayEvents.length > 0 && (
            <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-16 flex-shrink-0">
            {HOURS.map(h => (
              <div key={h} style={{ height: 64 }} className="border-b border-gray-100 pr-2 flex items-start justify-end pt-1">
                <span className="text-xs text-gray-400 leading-none">{formatHour(h)}</span>
              </div>
            ))}
          </div>

          <div
            className="flex-1 relative border-l border-gray-200"
            style={{ height: 64 * 24 }}
          >
            {HOURS.map(h => (
              <div
                key={h}
                style={{ height: 64, top: h * 64 }}
                className="absolute w-full border-b border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors duration-100"
                onClick={() => onHourClick(dateStr, h)}
              />
            ))}

            {isToday && (
              <div
                style={{ top: nowTop, left: 0, right: 0 }}
                className="absolute flex items-center z-10 pointer-events-none"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
                <div className="flex-1 h-px bg-red-500" />
              </div>
            )}

            {dayEvents.map(event => {
              const config = eventTypeConfig[event.type];
              const top = eventTop(event.start_time);
              const height = eventHeight(event.start_time, event.end_time);
              return (
                <div
                  key={event.id}
                  onClick={e => { e.stopPropagation(); onEventClick(event); }}
                  style={{ top, height, left: 8, right: 8, position: 'absolute' }}
                  className={`rounded-lg px-3 py-2 cursor-pointer border-l-4 ${config.bg} ${config.text} ${config.border} hover:shadow-md transition-shadow duration-150 z-20`}
                >
                  <div className="text-sm font-semibold leading-tight truncate">{event.title}</div>
                  {event.start_time && (
                    <div className="text-xs opacity-75 mt-0.5">
                      {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
                    </div>
                  )}
                  {event.location && (
                    <div className="text-xs opacity-60 mt-0.5 truncate">{event.location}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
