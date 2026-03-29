import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, FileText, Link, User, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activity';
import type { CalendarEvent } from './types';

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
        date: event.date,
        start_time: event.start_time ? event.start_time.slice(0, 5) : '',
        end_time: event.end_time ? event.end_time.slice(0, 5) : '',
        type: event.type,
        description: event.description || '',
        location: event.location || '',
        client_id: event.client_id || '',
        contact_id: event.contact_id || '',
      });
    } else {
      setForm({ ...defaultForm, date: initialDate || '' });
    }

    Promise.all([
      supabase.from('clients').select('id, name, company').eq('user_id', user.id).order('name'),
      supabase.from('contacts').select('id, name, position').eq('user_id', user.id).order('name'),
    ]).then(([{ data: cData }, { data: ctData }]) => {
      if (cData) setClients(cData as Client[]);
      if (ctData) setContacts(ctData as Contact[]);
    });
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
    setSaving(true);
    setError('');

    const payload = {
      user_id: user.id,
      title: form.title,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      time: form.start_time || '',
      duration: form.start_time && form.end_time ? `${form.start_time}–${form.end_time}` : '',
      type: form.type,
      description: form.description,
      location: form.location,
      client_id: form.client_id || null,
      contact_id: form.contact_id || null,
    };

    let savedData: CalendarEvent | null = null;
    let saveError: { message: string } | null = null;

    if (event) {
      const res = await supabase
        .from('events')
        .update(payload)
        .eq('id', event.id)
        .select()
        .single();
      savedData = res.data as CalendarEvent;
      saveError = res.error;
    } else {
      const res = await supabase
        .from('events')
        .insert([payload])
        .select()
        .single();
      savedData = res.data as CalendarEvent;
      saveError = res.error;
    }

    setSaving(false);

    if (saveError || !savedData) {
      setError('Failed to save event. Please try again.');
      return;
    }

    if (!event) {
      await logActivity({
        userId: user.id,
        type: 'event_added',
        title: `Event created: ${savedData.title}`,
        description: savedData.date ? `on ${savedData.date}` : '',
        entityId: savedData.id,
        entityType: 'event',
      });
    }

    onSaved(savedData);
    onClose();
  };

  const handleDelete = async () => {
    if (!event || !user) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from('events').delete().eq('id', event.id);
    setDeleting(false);
    if (deleteError) { setError('Failed to delete event. Please try again.'); return; }
    onDeleted?.(event.id);
    onClose();
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
              <User className="w-3 h-3 inline mr-1" />Associated Contact
            </label>
            <select name="contact_id" value={form.contact_id} onChange={handleChange} className="md-outlined-input">
              <option value="">No contact</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.position ? ` — ${c.position}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            {event && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="px-3 py-2.5 text-red-600 border border-red-200 text-sm font-medium rounded hover:bg-red-50 transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
            {event && confirmDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="px-3 py-2.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors duration-200 disabled:opacity-60 flex items-center gap-1.5"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 disabled:opacity-60"
            >
              {saving ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
