import React, { useEffect, useState, useRef } from 'react';
import { Mail, Phone, MapPin, Building, Star, CreditCard as Edit2, Trash2, X, Briefcase, Users } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import NotesSection from './NotesSection';
import TagChip from './TagChip';
import { useTagColors } from '../lib/useTags';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive' | 'pending';
  tags: string[];
  last_contact: string;
  starred: boolean;
}

interface LinkedContact {
  id: string;
  name: string;
  email: string;
  position: string;
}

interface ContactDetailProps {
  client: Client | null;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onEmailClient: (email: string) => void;
}

const statusConfig = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-800' },
  pending: { label: 'Pending', bg: 'bg-orange-100', text: 'text-orange-800' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const avatarColors = [
  'bg-blue-600', 'bg-teal-600', 'bg-orange-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-red-600', 'bg-green-600', 'bg-yellow-600',
];

const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const ContactDetail: React.FC<ContactDetailProps> = ({ client, onClose, onEdit, onDelete, onEmailClient }) => {
  const tagColors = useTagColors();
  const [linkedContacts, setLinkedContacts] = useState<LinkedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showCallTooltip, setShowCallTooltip] = useState(false);
  const callBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!client) {
      setLinkedContacts([]);
      setLoadingContacts(false);
      return;
    }
    let cancelled = false;
    setLoadingContacts(true);
    setLinkedContacts([]);
    pb
      .from('contacts')
      .select('id, name, email, position')
      .eq('client_id', client.id)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setLinkedContacts(data as LinkedContact[]);
        } else {
          setLinkedContacts([]);
        }
        setLoadingContacts(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingContacts(false);
      });
    return () => { cancelled = true; };
  }, [client?.id]);

  return (
    <div className={`fixed right-0 top-0 w-full sm:w-80 bg-white h-screen flex flex-col transform transition-transform duration-300 ease-in-out z-50 md-elevation-3 ${
      client ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {client && (
        <>
          <div className="bg-primary-700 px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-blue-200">Client Details</span>
              <button
                onClick={onClose}
                className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor(client.name)}`}>
                <span className="text-base font-medium text-white">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-medium text-white truncate">{client.name}</h2>
                  {client.starred && <Star className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0" />}
                </div>
                <p className="text-sm text-blue-200 truncate">{client.company}</p>
                {client.status && (
                  <span className={`inline-block mt-2 md-chip ${statusConfig[client.status].bg} ${statusConfig[client.status].text}`}>
                    {statusConfig[client.status].label}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(client)}
                    title="Edit client"
                    className="p-1.5 rounded text-gray-400 hover:text-primary-700 hover:bg-primary-50 transition-colors duration-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(client)}
                    title="Delete client"
                    className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-3 mt-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{client.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{client.company}</span>
                </div>
                {client.last_contact && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">Last contact: {client.last_contact}</span>
                  </div>
                )}
              </div>
            </div>

            {client.tags.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((tag, i) => (
                    <TagChip key={i} name={tag} color={tagColors[tag]} />
                  ))}
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Contacts</h3>
                {!loadingContacts && linkedContacts.length > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                    {linkedContacts.length}
                  </span>
                )}
              </div>
              {loadingContacts ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-4 h-4 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">Loading...</span>
                </div>
              ) : linkedContacts.length === 0 ? (
                <div className="flex items-center gap-2 py-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">No contacts linked to this client</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedContacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-primary-50 transition-colors duration-150">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor(contact.name)}`}>
                        <span className="text-xs font-medium text-white">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{contact.name}</p>
                        {contact.position && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <p className="text-xs text-gray-500 truncate">{contact.position}</p>
                          </div>
                        )}
                        {contact.email && !contact.position && (
                          <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                        )}
                      </div>
                      <a
                        href={`mailto:${contact.email}`}
                        title={`Email ${contact.name}`}
                        className="p-1.5 rounded text-gray-400 hover:text-primary-700 hover:bg-primary-100 transition-colors duration-150 flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <NotesSection entityId={client.id} entityType="client" entityName={client.name} />

            <div className="px-6 py-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => onEdit(client)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded border border-gray-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors duration-200"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Client Details
                </button>
                <button
                  onClick={() => onDelete(client)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded border border-red-100 hover:bg-red-50 transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Client
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
            <button
              type="button"
              onClick={() => client.email && onEmailClient(client.email)}
              disabled={!client.email}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <div className="flex-1 relative">
              <a
                ref={callBtnRef as unknown as React.Ref<HTMLAnchorElement>}
                href={client.phone ? `tel:${client.phone}` : undefined}
                onClick={e => {
                  if (!client.phone) { e.preventDefault(); return; }
                  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                  if (!isMobile) {
                    e.preventDefault();
                    setShowCallTooltip(v => !v);
                  }
                }}
                onBlur={() => setShowCallTooltip(false)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors duration-200 ${!client.phone ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
              {showCallTooltip && client.phone && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                  <span className="block text-gray-400 text-xs mb-0.5">Dial manually</span>
                  {client.phone}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContactDetail;
