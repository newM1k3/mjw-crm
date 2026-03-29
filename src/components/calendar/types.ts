export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  time?: string;
  duration?: string;
  type: 'meeting' | 'call' | 'deadline' | 'reminder';
  location?: string;
  description?: string;
  client_id?: string | null;
  contact_id?: string | null;
}

export const eventTypeConfig = {
  meeting: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', border: 'border-blue-400', solid: 'bg-blue-500' },
  call: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', border: 'border-green-400', solid: 'bg-green-500' },
  deadline: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', border: 'border-red-400', solid: 'bg-red-500' },
  reminder: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500', border: 'border-orange-400', solid: 'bg-orange-500' },
};

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
