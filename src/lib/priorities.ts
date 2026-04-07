import { formatTime } from '../components/calendar/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriorityItem {
  clientId: string;
  clientName: string;
  clientEmail: string;
  company: string;
  badge: string;
  badgeColor: 'red' | 'orange' | 'blue' | 'yellow' | 'gray';
  reason: string;
  action: 'Send Email' | 'View Calendar' | 'View Client';
}

interface ClientRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  last_contact: string;
  created: string;
}

interface InvoiceRecord {
  id: string;
  client_id: string;
  status: string;
  due_date: string;
}

interface EventRecord {
  id: string;
  client_id: string;
  start_time: string | null;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildPriorities(
  clients: ClientRecord[],
  invoices: InvoiceRecord[],
  todayTomorrowEvents: EventRecord[],
): PriorityItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const results: PriorityItem[] = [];
  const usedClientIds = new Set<string>();

  for (const client of clients) {
    if (usedClientIds.has(client.id)) continue;
    if (results.length >= 5) break;

    // Rule 1 — OVERDUE invoice
    const overdueInvoice = invoices.find(
      (inv) => inv.status === 'Overdue' && inv.client_id === client.id,
    );
    if (overdueInvoice) {
      results.push({
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        company: client.company,
        badge: 'Needs Attention',
        badgeColor: 'red',
        reason: 'Overdue invoice',
        action: 'Send Email',
      });
      usedClientIds.add(client.id);
      continue;
    }

    // Rule 2 — PENDING invoice due within 7 days
    const pendingInvoice = invoices.find((inv) => {
      if (inv.status !== 'Pending' || inv.client_id !== client.id) return false;
      const dueDate = new Date(inv.due_date + 'T00:00:00');
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
    if (pendingInvoice) {
      const dueDate = new Date(pendingInvoice.due_date + 'T00:00:00');
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      results.push({
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        company: client.company,
        badge: 'Follow Up',
        badgeColor: 'orange',
        reason: `Invoice due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
        action: 'Send Email',
      });
      usedClientIds.add(client.id);
      continue;
    }

    // Rule 3 — MEETING today or tomorrow
    const meetingEvent = todayTomorrowEvents.find(
      (ev) => ev.client_id === client.id,
    );
    if (meetingEvent) {
      const eventDateStr = meetingEvent.start_time ? meetingEvent.start_time.slice(0, 10) : '';
      const dayLabel = eventDateStr === todayStr ? 'today' : 'tomorrow';
      results.push({
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        company: client.company,
        badge: 'Upcoming',
        badgeColor: 'blue',
        reason: `Meeting ${dayLabel} at ${formatTime(meetingEvent.start_time)}`,
        action: 'View Calendar',
      });
      usedClientIds.add(client.id);
      continue;
    }

    // Rule 4 — COLD: active client, last contact 30+ days ago
    if (client.status === 'active' && client.last_contact) {
      const lastContact = new Date(client.last_contact + 'T00:00:00');
      const diffDays = Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 30) {
        results.push({
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          company: client.company,
          badge: 'Check In',
          badgeColor: 'yellow',
          reason: `No contact in ${diffDays} days`,
          action: 'Send Email',
        });
        usedClientIds.add(client.id);
        continue;
      }
    }

    // Rule 5 — NEW: active client, no last_contact, created within 14 days
    if (client.status === 'active' && !client.last_contact) {
      const createdDate = new Date(client.created);
      const diffDays = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 14) {
        results.push({
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.email,
          company: client.company,
          badge: 'New',
          badgeColor: 'gray',
          reason: 'New client \u2014 no follow-up logged yet',
          action: 'View Client',
        });
        usedClientIds.add(client.id);
        continue;
      }
    }
  }

  return results;
}
