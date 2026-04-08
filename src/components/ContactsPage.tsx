import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Phone, Mail, MapPin, Building, MoreVertical, Star, Trash2, CreditCard as Edit2, Upload } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import AddContactModal from './AddContactModal';
import EditContactModal from './EditContactModal';
import ContactDetailPanel from './ContactDetailPanel';
import ComposeModal from './email/ComposeModal';
import ImportContactsModal from './contacts/ImportContactsModal';
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

const avatarColors = [
  'bg-blue-600', 'bg-teal-600', 'bg-orange-600', 'bg-pink-600',
  'bg-green-600', 'bg-cyan-600', 'bg-red-600',
];

const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const ContactsPage: React.FC = () => {
  const { user } = useAuth();
  const tagColors = useTagColors();
  const { success: toastSuccess } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [composeTo, setComposeTo] = useState<string | null>(null);

  const fetchContacts = async () => {
    if (!user) return;
    setLoading(true);
    const data = await pb.collection('contacts').getFullList({ filter: `user_id = '${user.id}'`, sort: '-created' }).catch(() => null);
    if (data) {
      const typed = data as Contact[];
      setContacts(typed);
      const tagSet = new Set<string>();
      typed.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
      setAvailableTags(Array.from(tagSet).sort());
    }
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [user]);

  // ─── Real-time subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let unsub: (() => void) | null = null;
    pb.collection('contacts').subscribe('*', (e) => {
      const record = e.record as Contact;
      if ((record as any).user_id !== user.id) return;
      if (e.action === 'create') {
        setContacts(prev => {
          if (prev.some(c => c.id === record.id)) return prev;
          return [record, ...prev];
        });
        setAvailableTags(prev => {
          const next = new Set(prev);
          (record.tags || []).forEach(t => next.add(t));
          return Array.from(next).sort();
        });
      } else if (e.action === 'update') {
        setContacts(prev => prev.map(c => c.id === record.id ? record : c));
      } else if (e.action === 'delete') {
        setContacts(prev => prev.filter(c => c.id !== record.id));
        if (selectedContact?.id === record.id) setSelectedContact(null);
      }
    }).then(fn => { unsub = fn; }).catch(() => {});
    return () => { unsub?.(); };
  }, [user, selectedContact]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdded = (newContact: Contact) => {
    // Optimistic update — subscription will deduplicate on arrival
    setContacts(prev => prev.some(c => c.id === newContact.id) ? prev : [newContact, ...prev]);
    (newContact.tags || []).forEach(t => {
      setAvailableTags(prev => prev.includes(t) ? prev : [...prev, t].sort());
    });
    toastSuccess('Contact added', `${newContact.name} has been saved successfully.`);
  };

  const handleSaved = (updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedContact?.id === updated.id) setSelectedContact(updated);
    const tagSet = new Set<string>();
    [...contacts.map(c => c.id === updated.id ? updated : c)].forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
    setAvailableTags(Array.from(tagSet).sort());
    toastSuccess('Contact updated', `${updated.name} has been saved successfully.`);
  };

  const handleDelete = async (contact: Contact) => {
    await pb.collection('contacts').delete(contact.id).catch(() => null);
    setContacts(prev => prev.filter(c => c.id !== contact.id));
    if (selectedContact?.id === contact.id) setSelectedContact(null);
    setDeleteConfirmId(null);
    setOpenMenuId(null);
    toastSuccess('Contact deleted', `${contact.name} has been removed.`);
  };

  const toggleStar = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation();
    await pb.collection('contacts').update(id, { starred: !current }).catch(() => null);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, starred: !current } : c));
    if (selectedContact?.id === id) setSelectedContact(prev => prev ? { ...prev, starred: !current } : prev);
  };

  const filtered = contacts.filter(c => {
    const lower = searchTerm.trim().toLowerCase();
    const matchSearch = !lower ||
      (c.name || '').toLowerCase().includes(lower) ||
      (c.email || '').toLowerCase().includes(lower) ||
      (c.company || '').toLowerCase().includes(lower) ||
      (c.position || '').toLowerCase().includes(lower) ||
      (c.phone || '').toLowerCase().includes(lower) ||
      (c.location || '').toLowerCase().includes(lower);
    const matchTag = filterTag === 'all' || (c.tags || []).some(t => t.toLowerCase() === filterTag.toLowerCase());
    return matchSearch && matchTag;
  });

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      <div className="bg-primary-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-white">Contacts</h2>
            <p className="text-sm text-blue-200 mt-0.5">
              {filtered.length === contacts.length
                ? `${contacts.length} total`
                : `${filtered.length} of ${contacts.length}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded hover:bg-white/20 transition-colors duration-200"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 text-sm font-medium rounded hover:bg-blue-50 transition-colors duration-200 md-ripple"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Contact</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email or company..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded text-sm outline-none focus:border-primary-700 focus:border-2 transition-colors duration-200"
            />
          </div>
          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded text-sm text-gray-700 outline-none focus:border-primary-700 focus:border-2 cursor-pointer hidden sm:block"
          >
            <option value="all">All Tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`md-card hover:md-elevation-2 transition-shadow duration-200 overflow-hidden cursor-pointer ${
                    selectedContact?.id === contact.id ? 'ring-2 ring-primary-700 ring-offset-1' : ''
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor(contact.name)}`}>
                          <span className="text-sm font-medium text-white">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{contact.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{contact.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={e => toggleStar(e, contact.id, contact.starred)}
                          className="p-1 rounded text-gray-300 hover:text-yellow-500 transition-colors duration-200"
                        >
                          <Star className={`w-4 h-4 ${contact.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </button>
                        <div className="relative" ref={openMenuId === contact.id ? menuRef : null}>
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === contact.id ? null : contact.id); }}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === contact.id && (
                            <div className="absolute right-0 top-7 w-40 bg-white rounded-lg md-elevation-2 z-20 overflow-hidden border border-gray-100">
                              <button
                                onClick={e => { e.stopPropagation(); setEditContact(contact); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                Edit
                              </button>
                              {deleteConfirmId === contact.id ? (
                                <div className="px-4 py-2.5 border-t border-gray-100">
                                  <p className="text-xs text-gray-600 mb-2">Delete this contact?</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={e => { e.stopPropagation(); handleDelete(contact); }}
                                      className="flex-1 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                      className="flex-1 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50 transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteConfirmId(contact.id); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 border-t border-gray-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {contact.company && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{contact.phone}
                        </div>
                      )}
                      {contact.location && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{contact.location}
                        </div>
                      )}
                    </div>

                    {(contact.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(contact.tags || []).map((tag, i) => (
                          <TagChip key={i} name={tag} color={tagColors[tag]} />
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); if (contact.email) setComposeTo(contact.email); }}
                        disabled={!contact.email}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-700 text-white text-xs font-medium rounded hover:bg-primary-800 transition-colors duration-200 disabled:opacity-50"
                      >
                        <Mail className="w-3.5 h-3.5" />Email
                      </button>
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors duration-200"
                        >
                          <Phone className="w-3.5 h-3.5" />Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-900">
                  {contacts.length === 0 ? 'No contacts yet' : 'No contacts found'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {contacts.length === 0 ? 'Add your first contact to get started' : 'Try adjusting your search'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <ContactDetailPanel
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onEdit={contact => { setEditContact(contact); setSelectedContact(null); }}
        onDelete={contact => handleDelete(contact)}
        onEmail={email => setComposeTo(email)}
      />

      <AddContactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleAdded}
      />

      <EditContactModal
        contact={editContact}
        onClose={() => setEditContact(null)}
        onSaved={handleSaved}
      />

      <ImportContactsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={(_count) => {
          setIsImportModalOpen(false);
          fetchContacts();
        }}
      />

      {composeTo !== null && (
        <ComposeModal
          initialTo={composeTo}
          onClose={() => setComposeTo(null)}
          onSent={() => setComposeTo(null)}
          onDraftSaved={() => setComposeTo(null)}
        />
      )}
    </div>
  );
};

export default ContactsPage;
