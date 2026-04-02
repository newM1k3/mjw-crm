import React, { useState, useEffect } from 'react';
import { X, User, Building, Mail, Phone, MapPin, Briefcase, Tag, Link } from 'lucide-react';
import { pb, ensureAuth } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import TagInput from './TagInput';

interface Client {
  id: string;
  name: string;
  company: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  location: string;
  starred: boolean;
  tags: string[];
  client_id: string | null;
}

interface EditContactModalProps {
  contact: Contact | null;
  onClose: () => void;
  onSaved: (updated: Contact) => void;
}

const EditContactModal: React.FC<EditContactModalProps> = ({ contact, onClose, onSaved }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    location: '',
    tags: [] as string[],
    client_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!contact || !user) return;
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      position: contact.position,
      location: contact.location,
      tags: contact.tags,
      client_id: contact.client_id || '',
    });
    setError('');

    pb.collection('clients')
      .getFullList({ filter: `user_id = '${user.id}'`, sort: 'name' })
      .then(data => { if (data) setClients(data as Client[]); })
      .catch(() => {});
  }, [contact, user]);

  if (!contact) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await ensureAuth();

      const updates = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        position: formData.position,
        location: formData.location,
        tags: formData.tags,
        client_id: formData.client_id || null,
      };

      const saved = await pb.collection('contacts').update(contact.id, updates) as Contact;

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg md-elevation-4 w-full max-w-md overflow-hidden">
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-white">Edit Contact</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <User className="w-3 h-3 inline mr-1.5" />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="md-outlined-input"
                placeholder="Contact's full name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Mail className="w-3 h-3 inline mr-1.5" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="md-outlined-input"
                placeholder="contact@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  <Phone className="w-3 h-3 inline mr-1.5" />
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="md-outlined-input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  <Building className="w-3 h-3 inline mr-1.5" />
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="md-outlined-input"
                  placeholder="Company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  <Briefcase className="w-3 h-3 inline mr-1.5" />
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="md-outlined-input"
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  <MapPin className="w-3 h-3 inline mr-1.5" />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="md-outlined-input"
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Link className="w-3 h-3 inline mr-1.5" />
                Associated Client
              </label>
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="md-outlined-input"
              >
                <option value="">No client association</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Tag className="w-3 h-3 inline mr-1.5" />
                Tags
              </label>
              <TagInput
                value={formData.tags}
                onChange={tags => setFormData(f => ({ ...f, tags }))}
                placeholder="Add tags..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContactModal;
