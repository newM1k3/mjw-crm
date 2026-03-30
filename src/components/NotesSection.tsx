import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Plus, Trash2, Loader } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/activity';

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface NotesSectionProps {
  entityId: string;
  entityType: 'client' | 'contact';
  entityName: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ entityId, entityType, entityName }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user || !entityId) return;
    let cancelled = false;
    setLoading(true);
    pb
      .from('notes')
      .select('id, content, created_at')
      .eq('user_id', user.id)
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setNotes(data as Note[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, entityId, entityType]);

  const handleAdd = async () => {
    const trimmed = newNote.trim();
    if (!trimmed || !user) return;
    setSaving(true);
    const { data, error } = await pb
      .from('notes')
      .insert([{ user_id: user.id, entity_id: entityId, entity_type: entityType, content: trimmed }])
      .select('id, content, created_at')
      .single();
    if (!error && data) {
      setNotes(prev => [data as Note, ...prev]);
      setNewNote('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      await logActivity({
        userId: user.id,
        type: 'note_added',
        title: `Note added for ${entityName}`,
        description: trimmed.length > 80 ? trimmed.substring(0, 80) + '…' : trimmed,
        entityId,
        entityType,
      });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await pb.collection('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    setDeletingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewNote(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</h3>
        {!loading && notes.length > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
            {notes.length}
          </span>
        )}
      </div>

      <div className="mb-3">
        <textarea
          ref={textareaRef}
          value={newNote}
          onChange={autoResize}
          onKeyDown={handleKeyDown}
          placeholder="Write a note…"
          rows={2}
          className="w-full text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-primary-400 focus:bg-white transition-colors duration-150 leading-relaxed"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-gray-400">⌘↵ to save</span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newNote.trim() || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-medium rounded hover:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {saving ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Add Note
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Loading notes…</span>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex items-center gap-2 py-1 text-gray-400">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs">No notes yet</span>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="group relative bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100 hover:border-gray-200 transition-colors duration-150">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pr-6">{note.content}</p>
              <p className="text-xs text-gray-400 mt-1.5">{formatDate(note.created_at)}</p>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                disabled={deletingId === note.id}
                title="Delete note"
                className="absolute top-2 right-2 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150 disabled:opacity-50"
              >
                {deletingId === note.id
                  ? <Loader className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesSection;
