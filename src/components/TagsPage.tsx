import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Search, Hash, X, Users, Calendar, CreditCard as Edit2 } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import { invalidateTagCache } from '../lib/useTags';

interface Tag {
  id: string;
  name: string;
  color: string;
  color_key: string;
  description: string;
  created_at: string;
  clientCount: number;
  contactCount: number;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#64748B',
];

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const isLightColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
};

const hexToLight = (hex: string, alpha = 0.15): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface TagModalProps {
  tag: Tag | null;
  onClose: () => void;
  onSave: (tag: Tag) => void;
  userId: string;
}

const TagModal: React.FC<TagModalProps> = ({ tag, onClose, onSave, userId }) => {
  const [name, setName] = useState(tag?.name || '');
  const [description, setDescription] = useState(tag?.description || '');
  const [color, setColor] = useState(tag?.color || '#3B82F6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Tag name is required.'); return; }
    setSaving(true);
    setError('');

    if (tag) {
      const { data, err } = await pb
        .from('tags')
        .update({ name: name.trim(), description, color })
        .eq('id', tag.id)
        .select()
        .single() as { data: Record<string, unknown> | null; err: unknown };
      if (data) onSave({ ...tag, name: name.trim(), description, color });
    } else {
      const { data, error: insertError } = await pb
        .from('tags')
        .insert([{
          name: name.trim(),
          description,
          color,
          color_key: 'custom',
          count: 0,
          created_date: new Date().toISOString().split('T')[0],
          user_id: userId,
        }])
        .select()
        .single();
      if (!insertError && data) {
        onSave({ ...(data as Record<string, unknown>), clientCount: 0 } as unknown as Tag);
      } else if (insertError) {
        setError('Failed to create tag. Please try again.');
      }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg md-elevation-4 w-full max-w-md overflow-hidden">
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-white">{tag ? 'Edit Tag' : 'New Tag'}</h2>
          <button onClick={onClose} className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Tag Name
            </label>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ backgroundColor: hexToLight(color, 0.2) }}
              >
                <Hash className="w-4 h-4" style={{ color }} />
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                placeholder="e.g. VIP Client, Hot Lead..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Color
            </label>
            <div className="grid grid-cols-8 gap-2 mb-3">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full transition-all duration-150 ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-gray-500 scale-110'
                      : 'opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 font-medium">Custom:</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="text-xs font-mono text-gray-600">{color.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Description <span className="normal-case font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
              placeholder="What is this tag used for?"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 transition-colors"
            >
              {saving ? (tag ? 'Saving...' : 'Creating...') : (tag ? 'Save Changes' : 'Create Tag')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TagsPage: React.FC = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTagsWithCounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: tagsData }, { data: clientsData }, { data: contactsData }] = await Promise.all([
      pb.collection('tags').getFullList({ filter: `user_id = \"${user.id}\"`, fields: '*' }).order('created_at', { ascending: false }),
      pb.collection('clients').getFullList({ filter: `user_id = \"${user.id}\"`, fields: 'tags' }),
      pb.collection('contacts').getFullList({ filter: `user_id = \"${user.id}\"`, fields: 'tags' }),
    ]);

    if (tagsData) {
      const clientCountMap: Record<string, number> = {};
      if (clientsData) {
        clientsData.forEach(client => {
          if (Array.isArray(client.tags)) {
            client.tags.forEach((tagName: string) => {
              clientCountMap[tagName] = (clientCountMap[tagName] || 0) + 1;
            });
          }
        });
      }

      const contactCountMap: Record<string, number> = {};
      if (contactsData) {
        contactsData.forEach(contact => {
          if (Array.isArray(contact.tags)) {
            contact.tags.forEach((tagName: string) => {
              contactCountMap[tagName] = (contactCountMap[tagName] || 0) + 1;
            });
          }
        });
      }

      const enriched: Tag[] = tagsData.map(t => ({
        ...t,
        color: t.color || '#3B82F6',
        clientCount: clientCountMap[t.name] || 0,
        contactCount: contactCountMap[t.name] || 0,
      }));
      setTags(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTagsWithCounts(); }, [fetchTagsWithCounts]);

  const lower = searchTerm.trim().toLowerCase();
  const filtered = tags.filter(t =>
    !lower ||
    (t.name || '').toLowerCase().includes(lower) ||
    (t.description || '').toLowerCase().includes(lower)
  );

  const handleSave = (saved: Tag) => {
    setTags(prev => {
      const exists = prev.find(t => t.id === saved.id);
      if (exists) return prev.map(t => t.id === saved.id ? { ...t, ...saved } : t);
      return [saved, ...prev];
    });
    invalidateTagCache();
    setModalOpen(false);
    setEditingTag(null);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await pb.collection('tags').delete().eq('id', id);
    setTags(prev => prev.filter(t => t.id !== id));
    invalidateTagCache();
    setDeletingId(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTag(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-primary-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-white">Tags</h2>
            <p className="text-sm text-blue-200 mt-0.5">
              {tags.length} {tags.length === 1 ? 'tag' : 'tags'} &mdash; organize and categorize your clients and contacts
            </p>
          </div>
          <button
            onClick={() => { setEditingTag(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Tag</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors bg-gray-50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-900">
              {tags.length === 0 ? 'No tags yet' : 'No tags found'}
            </p>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              {tags.length === 0
                ? 'Create tags to organize and categorize your clients and contacts'
                : 'Try a different search term'}
            </p>
            {tags.length === 0 && (
              <button
                onClick={() => { setEditingTag(null); setModalOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Tag
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(tag => {
              const bgLight = hexToLight(tag.color, 0.12);
              const textColor = tag.color;
              const isLight = isLightColor(tag.color);

              return (
                <div
                  key={tag.id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden group"
                >
                  <div className="h-1.5 w-full" style={{ backgroundColor: tag.color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: bgLight }}
                        >
                          <Hash className="w-4 h-4" style={{ color: textColor }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{tag.name}</p>
                          <span
                            className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
                            style={{
                              backgroundColor: bgLight,
                              color: isLight ? '#374151' : textColor,
                            }}
                          >
                            #{tag.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => handleEdit(tag)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Edit tag"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          disabled={deletingId === tag.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete tag"
                        >
                          {deletingId === tag.id
                            ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>

                    {tag.description ? (
                      <p className="text-xs text-gray-500 mb-4 leading-relaxed line-clamp-2">{tag.description}</p>
                    ) : (
                      <p className="text-xs text-gray-300 italic mb-4">No description</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700">{tag.clientCount}</span>
                          <span className="text-xs text-gray-400">{tag.clientCount === 1 ? 'client' : 'clients'}</span>
                        </div>
                        {tag.contactCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-gray-700">{tag.contactCount}</span>
                            <span className="text-xs text-gray-400">{tag.contactCount === 1 ? 'contact' : 'contacts'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">
                          {new Date(tag.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <TagModal
          tag={editingTag}
          onClose={handleCloseModal}
          onSave={handleSave}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
};

export default TagsPage;
