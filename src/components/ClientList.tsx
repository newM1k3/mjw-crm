import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Star, Phone, Mail, Plus, FilterX, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import AddClientModal from './AddClientModal';
import TagChip from './TagChip';
import { pb, ensureAuth } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/activity';
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
  created_at?: string;
}

interface ClientListProps {
  onSelectClient: (client: Client) => void;
  selectedClientId: string | null;
  registerRefresh?: (fn: () => void) => void;
}

type SortField = 'name' | 'company' | 'created_at';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

const statusConfig = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-800' },
  pending: { label: 'Pending', bg: 'bg-orange-100', text: 'text-orange-800' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const avatarColors = [
  'bg-blue-600', 'bg-teal-600', 'bg-orange-600', 'bg-pink-600',
  'bg-green-600', 'bg-cyan-600', 'bg-red-600',
];

const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const SortIcon: React.FC<{ field: SortField; sortField: SortField; sortDir: SortDir }> = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline-block" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-primary-700 ml-1 inline-block" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary-700 ml-1 inline-block" />;
};

const ClientList: React.FC<ClientListProps> = ({ onSelectClient, selectedClientId, registerRefresh }) => {
  const { user } = useAuth();
  const tagColors = useTagColors();
  const [clients, setClients] = useState<Client[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const registeredRef = useRef(false);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    const data = await pb.collection('clients').getFullList({ filter: `user_id = \"${user.id}\"` }).catch(() => null);
    if (data) {
      const typedData = data as Client[];
      setClients(typedData);
      const tagSet = new Set<string>();
      typedData.forEach(c => c.tags.forEach(t => tagSet.add(t)));
      setAvailableTags(Array.from(tagSet).sort());
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  useEffect(() => {
    if (registerRefresh && !registeredRef.current) {
      registeredRef.current = true;
      registerRefresh(fetchClients);
    }
  }, [registerRefresh]);

  /**
   * Called by AddClientModal with the already-created Client record.
   * We simply prepend it to local state — no second PocketBase call needed.
   */
  const handleAddClient = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    newClient.tags.forEach(t => {
      setAvailableTags(prev => prev.includes(t) ? prev : [...prev, t].sort());
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    const filtered = clients.filter(client => {
      const matchesSearch = !lower ||
        (client.name || '').toLowerCase().includes(lower) ||
        (client.company || '').toLowerCase().includes(lower) ||
        (client.email || '').toLowerCase().includes(lower) ||
        (client.phone || '').toLowerCase().includes(lower);
      const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
      const matchesTag = filterTag === 'all' || (client.tags || []).some(t => t.toLowerCase() === filterTag.toLowerCase());
      return matchesSearch && matchesStatus && matchesTag;
    });

    filtered.sort((a, b) => {
      let valA: string;
      let valB: string;
      if (sortField === 'created_at') {
        valA = a.created_at || '';
        valB = b.created_at || '';
      } else {
        valA = (a[sortField] || '').toLowerCase();
        valB = (b[sortField] || '').toLowerCase();
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [clients, searchTerm, filterStatus, filterTag, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageClients = filteredAndSorted.slice(pageStart, pageStart + PAGE_SIZE);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterTag('all');
    setPage(1);
  };

  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, filterTag]);

  const hasFilters = filterStatus !== 'all' || filterTag !== 'all' || searchTerm !== '';

  const ThSort: React.FC<{ field: SortField; label: string; className?: string }> = ({ field, label, className }) => (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 group ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      {label}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </th>
  );

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden border-r border-gray-200">
      <div className="bg-primary-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-white">Clients</h2>
            <p className="text-sm text-blue-200 mt-0.5">
              {filteredAndSorted.length === clients.length
                ? `${clients.length} total`
                : `${filteredAndSorted.length} of ${clients.length}`}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 text-sm font-medium rounded md-ripple hover:bg-blue-50 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Client</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, company, email or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded text-sm text-gray-900 bg-white outline-none transition-colors duration-200 focus:border-primary-700 focus:border-2"
            />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none px-3 py-2.5 border border-gray-300 rounded text-sm text-gray-700 bg-white outline-none focus:border-primary-700 focus:border-2 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterTag}
              onChange={e => { setFilterTag(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none px-3 py-2.5 border border-gray-300 rounded text-sm text-gray-700 bg-white outline-none focus:border-primary-700 focus:border-2 cursor-pointer"
            >
              <option value="all">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <select
              value={`${sortField}:${sortDir}`}
              onChange={e => {
                const [f, d] = e.target.value.split(':') as [SortField, SortDir];
                setSortField(f);
                setSortDir(d);
                setPage(1);
              }}
              className="flex-1 sm:flex-none px-3 py-2.5 border border-gray-300 rounded text-sm text-gray-700 bg-white outline-none focus:border-primary-700 focus:border-2 cursor-pointer"
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="company:asc">Company A–Z</option>
              <option value="company:desc">Company Z–A</option>
            </select>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-2.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200"
                title="Clear filters"
              >
                <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pageClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-sm">{hasFilters ? 'No clients match your filters.' : 'No clients yet. Add your first client!'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <ThSort field="name" label="Name" />
                    <ThSort field="company" label="Company" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                    <ThSort field="created_at" label="Added" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageClients.map(client => (
                    <tr
                      key={client.id}
                      onClick={() => onSelectClient(client)}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-blue-50 ${selectedClientId === client.id ? 'bg-blue-50 border-l-2 border-primary-700' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-xs font-medium text-white">{client.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900">{client.name}</span>
                            {client.starred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{client.company}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <a href={`mailto:${client.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-700 transition-colors">
                            <Mail className="w-3 h-3" />{client.email}
                          </a>
                          <a href={`tel:${client.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-700 transition-colors">
                            <Phone className="w-3 h-3" />{client.phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[client.status]?.bg} ${statusConfig[client.status]?.text}`}>
                          {statusConfig[client.status]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(client.tags || []).slice(0, 3).map(tag => (
                            <TagChip key={tag} tag={tag} colorKey={tagColors[tag]} />
                          ))}
                          {(client.tags || []).length > 3 && (
                            <span className="text-xs text-gray-400">+{client.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {client.created_at ? new Date(client.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {pageClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client)}
                  className={`p-4 cursor-pointer transition-colors duration-150 hover:bg-blue-50 ${selectedClientId === client.id ? 'bg-blue-50 border-l-2 border-primary-700' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-sm font-medium text-white">{client.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                        {client.starred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{client.company}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[client.status]?.bg} ${statusConfig[client.status]?.text}`}>
                      {statusConfig[client.status]?.label}
                    </span>
                  </div>
                  {(client.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {client.tags.slice(0, 4).map(tag => (
                        <TagChip key={tag} tag={tag} colorKey={tagColors[tag]} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-500">
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredAndSorted.length)} of {filteredAndSorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 px-2">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddClient={(newClient) => {
          handleAddClient(newClient);
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
};

export default ClientList;
