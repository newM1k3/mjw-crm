import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Building, Briefcase, Star, CreditCard as Edit2, Trash2, X, Link } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import NotesSection from './NotesSection';
import TagChip from './TagChip';
import { useTagColors } from '../lib/useTags';

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

interface ContactDetailPanelProps {
  contact: Contact | null;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onEmail?: (email: string) => void;
}

const avatarColors = [
  'bg-blue-600', 'bg-teal-600', 'bg-orange-600', 'bg-pink-600',
  'bg-green-600', 'bg-cyan-600', 'bg-red-600', 'bg-yellow-600',
];

const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const ContactDetailPanel: React.FC<ContactDetailPanelProps> = ({ contact, onClose, onEdit, onDelete, onEmail }) => {
  const tagColors = useTagColors();
  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    if (!contact?.client_id) {
      setClientName(null);
      return;
    }
    pb
      .from('clients')
      .select('name, company')
      .eq('id', contact.client_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setClientName(data.company ? `${data.name} — ${data.company}` : data.name);
        } else {
          setClientName(null);
        }
      });
  }, [contact?.client_id]);

  return (
    <>
      {contact && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div className={`fixed right-0 top-0 w-full sm:w-80 bg-white h-screen flex flex-col transform transition-transform duration-300 ease-in-out z-50 md-elevation-3 ${
        contact ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {contact && (
          <>
            <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-blue-200">Contact Details</span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor(contact.name)}`}>
                  <span className="text-base font-medium text-white">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-medium text-white truncate">{contact.name}</h2>
                    {contact.starred && <Star className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />}
                  </div>
                  {contact.position && (
                    <p className="text-sm text-blue-200 truncate">{contact.position}</p>
                  )}
                  {contact.company && (
                    <p className="text-xs text-blue-300 truncate mt-0.5">{contact.company}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(contact)}
                      title="Edit contact"
                      className="p-1.5 rounded text-gray-400 hover:text-primary-700 hover:bg-primary-50 transition-colors duration-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(contact)}
                      title="Delete contact"
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{contact.phone}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{contact.company}</span>
                    </div>
                  )}
                  {contact.position && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{contact.position}</span>
                    </div>
                  )}
                  {contact.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{contact.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {clientName && (
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Associated Client</h3>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary-50">
                    <Link className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="text-sm text-primary-700 font-medium truncate">{clientName}</span>
                  </div>
                </div>
              )}

              {contact.tags.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag, i) => (
                      <TagChip key={i} name={tag} color={tagColors[tag]} />
                    ))}
                  </div>
                </div>
              )}

              <NotesSection entityId={contact.id} entityType="contact" entityName={contact.name} />

              <div className="px-6 py-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onEdit(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded border border-gray-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors duration-200"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Contact Details
                  </button>
                  <button
                    onClick={() => onDelete(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded border border-red-100 hover:bg-red-50 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Contact
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
              <button
                onClick={() => contact.email && (onEmail ? onEmail(contact.email) : window.location.assign(`mailto:${contact.email}`))}
                disabled={!contact.email}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors duration-200"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ContactDetailPanel;
