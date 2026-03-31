import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, CreditCard as Edit2, Check } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { useAuth } from '../../contexts/AuthContext';
import RichTextEditor from './RichTextEditor';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  plain_content: string;
}

interface EmailTemplatesModalProps {
  onClose: () => void;
  onSelect: (template: EmailTemplate) => void;
}

type View = 'list' | 'create' | 'edit';

const EmailTemplatesModal: React.FC<EmailTemplatesModalProps> = ({ onClose, onSelect }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', html_content: '', plain_content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await pb
.collection('email_templates').getFullList({ filter: `user_id = "${user.id}"`, sort: '-updated' });
    if (data) setTemplates(data as EmailTemplate[]);
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ name: '', subject: '', html_content: '', plain_content: '' });
    setEditing(null);
    setView('create');
  };

  const openEdit = (tpl: EmailTemplate) => {
    setForm({ name: tpl.name, subject: tpl.subject, html_content: tpl.html_content, plain_content: tpl.plain_content });
    setEditing(tpl);
    setView('edit');
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);

    const plainFromHtml = form.html_content.replace(/<[^>]+>/g, '').trim();
    const payload = { ...form, plain_content: plainFromHtml, updated_at: new Date().toISOString() };

    if (view === 'edit' && editing) {
      const { data } = await pb
.collection('email_templates').update(editing.id, payload).catch(() => null);
      if (data) setTemplates(prev => prev.map(t => t.id === editing.id ? data as EmailTemplate : t));
    } else {
      const data = await pb.collection('email_templates').create({ ...payload, user_id: user.id }).catch(() => null);
    const dbError = data ? null : 'Failed to create record';
      if (data) setTemplates(prev => [data as EmailTemplate, ...prev]);
    }

    setSaving(false);
    setView('list');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await pb.collection('email_templates').delete(id).catch(() => null);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const title = view === 'create' ? 'New Template' : view === 'edit' ? 'Edit Template' : 'Email Templates';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg md-elevation-4 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-primary-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className="p-1 rounded text-blue-200 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5 rotate-45" style={{ transform: 'rotate(45deg)' }} />
              </button>
            )}
            <h3 className="text-sm font-medium text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white bg-opacity-20 text-white text-xs font-medium rounded hover:bg-opacity-30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Template
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {view === 'list' ? (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">No templates yet</p>
                <p className="text-xs text-gray-500 mb-4">Create reusable email templates to speed up your workflow</p>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => onSelect(tpl)}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 cursor-pointer group transition-colors duration-150"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tpl.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{tpl.subject}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(tpl); }}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => handleDelete(tpl.id, e)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Check className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-60 flex-shrink-0 ml-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome Email, Follow-up..."
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 outline-none focus:border-primary-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Default Subject</label>
                <input
                  type="text"
                  placeholder="Subject line..."
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 outline-none focus:border-primary-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
                <RichTextEditor
                  value={form.html_content}
                  onChange={html => setForm({ ...form, html_content: html })}
                  placeholder="Write your template..."
                  minHeight={200}
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setView('list')}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  view === 'edit' ? 'Save Changes' : 'Create Template'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesModal;
