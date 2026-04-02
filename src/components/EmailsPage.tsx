import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, Mail, Reply, Forward, Trash2, Star, Paperclip,
  Send, Inbox, FileText, RotateCcw
} from 'lucide-react';
import { pb, ensureAuth } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import ComposeModal from './email/ComposeModal';

interface Email {
  id: string;
  from_address: string;
  to_address: string;
  cc_address: string;
  bcc_address: string;
  subject: string;
  preview: string;
  content: string;
  html_content: string;
  date: string;
  read: boolean;
  starred: boolean;
  has_attachment: boolean;
  labels: string[];
  folder: string;
}

type Folder = 'inbox' | 'sent' | 'drafts' | 'trash';
type ComposeMode = 'new' | 'reply' | 'forward';

interface ComposeContext {
  mode: ComposeMode;
  originalId: string;
  fromAddress: string;
  subject: string;
  date: string;
  content: string;
}

const FOLDERS: { key: Folder; label: string; icon: React.ReactNode }[] = [
  { key: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
  { key: 'sent', label: 'Sent', icon: <Send className="w-4 h-4" /> },
  { key: 'drafts', label: 'Drafts', icon: <FileText className="w-4 h-4" /> },
  { key: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
];

interface EmailsPageProps {
  initialComposeTo?: string | null;
  onComposeClear?: () => void;
}

const EmailsPage: React.FC<EmailsPageProps> = ({ initialComposeTo, onComposeClear }) => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
  const [isComposing, setIsComposing] = useState(false);
  const [composeContext, setComposeContext] = useState<ComposeContext | undefined>();
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const initialComposeHandled = useRef(false);

  const fetchEmails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const fetchedEmails = await pb.collection('emails').getFullList({ filter: `user_id = '${user.id}'`, sort: '-date' }).catch(() => null);

    if (fetchedEmails) {
      const all = fetchedEmails as Email[];
      setEmails(all);
      const counts: Record<string, number> = {};
      FOLDERS.forEach(f => {
        counts[f.key] = all.filter(e => e.folder === f.key).length;
      });
      counts['unread'] = all.filter(e => !e.read && e.folder === 'inbox').length;
      setFolderCounts(counts);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  useEffect(() => {
    if (initialComposeTo && !initialComposeHandled.current) {
      initialComposeHandled.current = true;
      setComposeContext(undefined);
      setIsComposing(true);
      onComposeClear?.();
    }
  }, [initialComposeTo, onComposeClear]);

  const folderEmails = emails.filter(email => {
    const matchFolder = email.folder === currentFolder;
    const matchSearch = !searchTerm || (
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.preview || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchFolder && matchSearch;
  });

  const selectEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.read && email.folder !== 'drafts') {
      try { await ensureAuth(); } catch { return; }
      await pb.collection('emails').update(email.id, { read: true }).catch(() => null);
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
      setFolderCounts(prev => ({ ...prev, unread: Math.max(0, (prev.unread || 0) - 1) }));
    }
  };

  const toggleStar = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await ensureAuth(); } catch { return; }
    await pb.collection('emails').update(id, { starred: !current }).catch(() => null);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !current } : e));
    if (selectedEmail?.id === id) setSelectedEmail(prev => prev ? { ...prev, starred: !current } : null);
  };

  const moveToTrash = async (email: Email) => {
    try { await ensureAuth(); } catch { return; }
    await pb.collection('emails').update(email.id, { folder: 'trash' }).catch(() => null);
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, folder: 'trash' } : e));
    setFolderCounts(prev => ({
      ...prev,
      [email.folder]: Math.max(0, (prev[email.folder] || 0) - 1),
      trash: (prev.trash || 0) + 1,
    }));
    if (selectedEmail?.id === email.id) setSelectedEmail(null);
  };

  const permanentDelete = async (id: string) => {
    try { await ensureAuth(); } catch { return; }
    await pb.collection('emails').delete(id).catch(() => null);
    setEmails(prev => prev.filter(e => e.id !== id));
    setFolderCounts(prev => ({ ...prev, trash: Math.max(0, (prev.trash || 0) - 1) }));
    if (selectedEmail?.id === id) setSelectedEmail(null);
  };

  const restoreFromTrash = async (email: Email) => {
    try { await ensureAuth(); } catch { return; }
    const restoreFolder = email.labels?.includes('Sent') ? 'sent' : 'inbox';
    await pb.collection('emails').update(email.id, { folder: restoreFolder }).catch(() => null);
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, folder: restoreFolder } : e));
    setFolderCounts(prev => ({
      ...prev,
      trash: Math.max(0, (prev.trash || 0) - 1),
      [restoreFolder]: (prev[restoreFolder] || 0) + 1,
    }));
    if (selectedEmail?.id === email.id) setSelectedEmail(null);
  };

  const openReply = (email: Email) => {
    setComposeContext({
      mode: 'reply',
      originalId: email.id,
      fromAddress: email.from_address,
      subject: email.subject,
      date: new Date(email.date).toLocaleString(),
      content: email.html_content || email.content,
    });
    setIsComposing(true);
  };

  const openForward = (email: Email) => {
    setComposeContext({
      mode: 'forward',
      originalId: email.id,
      fromAddress: email.from_address,
      subject: email.subject,
      date: new Date(email.date).toLocaleString(),
      content: email.html_content || email.content,
    });
    setIsComposing(true);
  };

  const openDraftForEdit = (email: Email) => {
    setComposeContext({
      mode: 'new',
      originalId: email.id,
      fromAddress: '',
      subject: email.subject,
      date: '',
      content: email.html_content || email.content,
    });
    setIsComposing(true);
  };

  const handleSent = (email: Record<string, unknown>) => {
    setEmails(prev => [email as Email, ...prev]);
    setFolderCounts(prev => ({ ...prev, sent: (prev.sent || 0) + 1 }));
  };

  const handleDraftSaved = (email: Record<string, unknown>) => {
    const e = email as Email;
    setEmails(prev => {
      const exists = prev.find(x => x.id === e.id);
      if (exists) return prev.map(x => x.id === e.id ? e : x);
      return [e, ...prev];
    });
    setFolderCounts(prev => ({ ...prev, drafts: emails.filter(x => x.folder === 'drafts').length + 1 }));
  };

  const handleComposeClosed = () => {
    setIsComposing(false);
    setComposeContext(undefined);
  };

  const currentFolderLabel = FOLDERS.find(f => f.key === currentFolder)?.label || 'Inbox';

  return (
    <div className="flex-1 flex bg-white overflow-hidden">
      <div className="w-56 flex flex-col border-r border-gray-200 flex-shrink-0 bg-gray-50">
        <div className="px-4 py-4 flex-shrink-0">
          <button
            onClick={() => { setComposeContext(undefined); setIsComposing(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors duration-200 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>
        </div>

        <nav className="flex-1 px-2 pb-4 space-y-0.5">
          {FOLDERS.map(folder => (
            <button
              key={folder.key}
              onClick={() => { setCurrentFolder(folder.key); setSelectedEmail(null); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                currentFolder === folder.key
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={currentFolder === folder.key ? 'text-primary-600' : 'text-gray-400'}>
                  {folder.icon}
                </span>
                {folder.label}
              </span>
              {(folderCounts[folder.key] || 0) > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  currentFolder === folder.key
                    ? 'bg-primary-100 text-primary-700'
                    : folder.key === 'inbox' && (folderCounts.unread || 0) > 0
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {folder.key === 'inbox' && (folderCounts.unread || 0) > 0
                    ? folderCounts.unread
                    : folderCounts[folder.key]}
                </span>
              )}
            </button>
          ))}

          <div className="pt-3 mt-3 border-t border-gray-200">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Filters</p>
            {[
              { key: 'starred', label: 'Starred', count: emails.filter(e => e.starred).length },
              { key: 'attachments', label: 'Attachments', count: emails.filter(e => e.has_attachment).length },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => { setCurrentFolder('inbox'); setSearchTerm(''); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors duration-150"
              >
                <span className="flex items-center gap-2.5">
                  {item.key === 'starred'
                    ? <Star className="w-4 h-4 text-gray-400" />
                    : <Paperclip className="w-4 h-4 text-gray-400" />
                  }
                  {item.label}
                </span>
                {item.count > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="w-80 flex flex-col border-r border-gray-200 flex-shrink-0">
        <div className="px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-gray-900">{currentFolderLabel}</h2>
            <span className="text-xs text-gray-500">{folderEmails.length} messages</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-100 text-gray-900 placeholder-gray-400 text-sm rounded-lg outline-none focus:bg-gray-200 transition-colors duration-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : folderEmails.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No emails in {currentFolderLabel.toLowerCase()}</p>
            </div>
          ) : (
            folderEmails.map(email => (
              <div
                key={email.id}
                onClick={() => currentFolder === 'drafts' ? openDraftForEdit(email) : selectEmail(email)}
                className={`px-4 py-3.5 cursor-pointer transition-colors duration-150 relative ${
                  selectedEmail?.id === email.id ? 'bg-primary-50 border-l-2 border-primary-600' : 'hover:bg-gray-50 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {!email.read && email.folder !== 'sent' && email.folder !== 'drafts' && (
                      <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" />
                    )}
                    {email.has_attachment && <Paperclip className="w-3 h-3 text-gray-400" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">
                      {new Date(email.date).toLocaleDateString()}
                    </span>
                    <button
                      onClick={e => toggleStar(email.id, email.starred, e)}
                      className={`${email.starred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'} transition-colors`}
                    >
                      <Star className={`w-3.5 h-3.5 ${email.starred ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
                <p className={`text-sm truncate ${!email.read && email.folder === 'inbox' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {currentFolder === 'sent' || currentFolder === 'drafts' ? `To: ${email.to_address}` : email.from_address}
                </p>
                <p className={`text-xs truncate mt-0.5 ${!email.read && email.folder === 'inbox' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                  {email.subject || '(no subject)'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{email.preview}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {selectedEmail ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 flex-1 pr-4 leading-snug">
                  {selectedEmail.subject || '(no subject)'}
                </h2>
                <div className="flex items-center gap-1">
                  {selectedEmail.folder !== 'trash' ? (
                    <>
                      <button
                        onClick={() => openReply(selectedEmail)}
                        title="Reply"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" /> Reply
                      </button>
                      <button
                        onClick={() => openForward(selectedEmail)}
                        title="Forward"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      >
                        <Forward className="w-3.5 h-3.5" /> Forward
                      </button>
                      <div className="w-px h-4 bg-gray-200 mx-1" />
                      <button
                        onClick={() => moveToTrash(selectedEmail)}
                        title="Move to Trash"
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => restoreFromTrash(selectedEmail)}
                        title="Restore"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                      <button
                        onClick={() => permanentDelete(selectedEmail.id)}
                        title="Delete Permanently"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete forever
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm text-gray-700">
                    From: <span className="font-medium">{selectedEmail.from_address}</span>
                  </p>
                  <p className="text-xs text-gray-500">To: {selectedEmail.to_address}</p>
                  {selectedEmail.cc_address && (
                    <p className="text-xs text-gray-500">CC: {selectedEmail.cc_address}</p>
                  )}
                  {selectedEmail.bcc_address && (
                    <p className="text-xs text-gray-500">BCC: {selectedEmail.bcc_address}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 flex-shrink-0 ml-4">
                  {new Date(selectedEmail.date).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
              {selectedEmail.html_content ? (
                <div
                  className="prose prose-sm max-w-none text-gray-800
                    [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_blockquote]:italic
                    [&_a]:text-primary-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {selectedEmail.content}
                </div>
              )}
            </div>

            {selectedEmail.folder !== 'trash' && (
              <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
                <div className="flex gap-3">
                  <button
                    onClick={() => openReply(selectedEmail)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                  <button
                    onClick={() => openForward(selectedEmail)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Forward className="w-4 h-4" />
                    Forward
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Mail className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Select an email to read</p>
              <p className="text-xs text-gray-400 mt-1">{folderEmails.length} messages in {currentFolderLabel.toLowerCase()}</p>
            </div>
          </div>
        )}
      </div>

      {isComposing && (
        <ComposeModal
          onClose={handleComposeClosed}
          onSent={handleSent}
          onDraftSaved={handleDraftSaved}
          context={composeContext}
          initialTo={!composeContext ? (initialComposeTo || undefined) : undefined}
        />
      )}
    </div>
  );
};

export default EmailsPage;
