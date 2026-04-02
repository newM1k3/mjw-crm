import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, FileText, Link, Trash2 } from 'lucide-react';
import { pb, ensureAuth } from '../../lib/pocketbase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activity';
import type { CalendarEvent } from './types';
import { getEventDate } from './types';

interface Client { id: string; name: string; company: string; }
interface Contact { id: string; name: string; position: string; }

interface EventModalProps {
  isOpen: boolean;
  initialDate?: string;
  event?: CalendarEvent | null;
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
  onDeleted?: (eventId: string) => void;
}

/** Combine a YYYY-MM-DD date string and HH:mm time string into a PocketBase datetime string. */
function toISODatetime(date: string, time: string): string | null {
  if (!date) return null;
  const t = time || '00:00';
  return `${date} ${t}:00.000Z`;
}

/** Extract HH:mm from a PocketBase datetime string like "2026-04-02 14:00:00.000Z" */
function extractTime(dt: string | null | undefined): string {
  if (!dt) return '';
  const timePart = dt.includes('T') ? dt.split('T')[1] : dt.includes(' ') ? dt.split(' ')[1] : '';
  return timePart ? timePart.slice(0, 5) : '';
}

const defaultForm = {
  title: '',
  date: '',
  start_time: '',
  end_time: '',
  type: 'meeting' as CalendarEvent['type'],
  description: '',
  location: '',
  client_id: '',
  contact_id: '',
};

const EventModal: React.FC<EventModalProps> = ({ isOpen, initialDate, event, onClose, onSaved, onDeleted }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...defaultForm });
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !user) return;
    setError('');
    setConfirmDelete(false);

    if (event) {
      setForm({
        title: event.title,
        // Derive the date from start_time (first 10 chars of "2026-04-02 14:00:00.000Z")
        date: getEventDate(event),
        start_time: extractTime(event.start_time),
        end_time: extractTime(event.end_time),
        type: event.type,
        description: event.description || '',
        location: event.location || '',
        client_id: event.client_id || '',
        contact_id: event.contact_id || '',
      });
    } else {
      setForm({ ...defaultForm, date: initialDate || '' });
    }

    // Load clients and contacts for association dropdowns.
    Promise.all([
      pb.collection('clients').getFullList({ filter: `user_id = '${user.id}'`, sort: 'name' }),
      pb.collection('contacts').getFullList({ filter: `user_id = '${user.id}'`, sort: 'name' }),
    ]).then(([clientList, contactList]) => {
      setClients(clientList as Client[]);
      setContacts(contactList as Contact[]);
    }).catch(() => {});
  }, [isOpen, event, initialDate, user]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.date) { setError('Please select a date.'); return; }
    setSaving(true);
    setError('');

    try {
      await ensureAuth();

      // PocketBase stores datetimes as "YYYY-MM-DD HH:mm:ss.sssZ".
      // We combine the date picker value with the time picker value.
      const startDatetime = toISODatetime(form.date, form.start_time);
      const endDatetime = form.end_time ? toISODatetime(form.date, form.end_time) : null;

      const payload = {
        user_id: user.id,
        title: form.title,
        start_time: startDatetime,
        end_time: endDatetime,
        type: form.type,
        description: form.description,
        location: form.location,
        client_id: form.client_id || null,
        contact_id: form.contact_id || null,
      };

      let savedEvent: CalendarEvent;

      if (event) {
        savedEvent = await pb.collection('events').update(event.id, payload) as CalendarEvent;
      } else {
        savedEvent = await pb.collection('events').create(payload) as CalendarEvent;

        await logActivity({
          userId: user.id,
          type: 'event_added',
          title: `Event created: ${savedEvent.title}`,
          description: form.date ? `on ${form.date}` : '',
          entityId: savedEvent.id,
          entityType: 'event',
        });
      }

      onSaved(savedEvent);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !user) return;
    setDeleting(true);
    setError('');

    try {
      await ensureAuth();
      await pb.collection('events').delete(event.id);
      onDeleted?.(event.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg md-elevation-4 w-full max-w-lg overflow-hidden">
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-white">{event ? 'Edit Event' : 'New Event'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="md-outlined-input"
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />Date
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                className="md-outlined-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Type
              </label>
              <select name="type" value={form.type} onChange={handleChange} className="md-outlined-input">
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="deadline">Deadline</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Clock className="w-3 h-3 inline mr-1" />Start Time
              </label>
              <input
                type="time"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                className="md-outlined-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Clock className="w-3 h-3 inline mr-1" />End Time
              </label>
              <input
                type="time"
                name="end_time"
                value={form.end_time}
                onChange={handleChange}
                className="md-outlined-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />Location
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="md-outlined-input"
              placeholder="Conference room, video call..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              <FileText className="w-3 h-3 inline mr-1" />Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="md-outlined-input resize-none"
              placeholder="Add notes or details..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              <Link className="w-3 h-3 inline mr-1" />Associated Client
            </label>
            <select name="client_id" value={form.client_id} onChange={handleChange} className="md-outlined-input">
              <option value="">No client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              <Link className="w-3 h-3 inline mr-1" />Associated Contact
            </label>
            <select name="contact_id" value={form.contact_id} onChange={handleChange} className="md-outlined-input">
              <option value="">No contact</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {event && (
            <div className="pt-2 border-t border-gray-100">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Delete this event?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded hover:bg-primary-800 disabled:opacity-50 transition-colors duration-200"
            >
              {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
