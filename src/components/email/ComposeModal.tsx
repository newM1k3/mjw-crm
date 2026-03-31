import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, AlertCircle, CheckCircle, FileText, Save, User } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import RichTextEditor from './RichTextEditor';
import EmailTemplatesModal, { EmailTemplate } from './EmailTemplatesModal';

interface ComposeData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  html_content: string;
}

type SendStatus = 'idle' | 'sending' | 'success' | 'error' | 'saving_draft';

type ComposeMode = 'new' | 'reply' | 'forward';

interface ReplyForwardContext {
  mode: ComposeMode;
  originalId: string;
  fromAddress: string;
  subject: string;
  date: string;
  content: string;
}

interface ComposeModalProps {
  onClose: () => void;
  onSent: (email: Record<string, unknown>) => void;
  onDraftSaved: (email: Record<string, unknown>) => void;
  context?: ReplyForwardContext;
  initialTo?: string;
}

interface RecipientSuggestion {
  id: string;
  name: string;
  email: string;
  type: 'contact' | 'client';
}

const htmlToPlain = (html: string): string =>
  html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, onSent, onDraftSaved, context, initialTo }) => {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [composeData, setComposeData] = useState<ComposeData>({
    to: initialTo || '',
    cc: '',
    bcc: '',
    subject: '',
    html_content: '',
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sendError, setSendError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<RecipientSuggestion[]>([]);
  const [allRecipients, setAllRecipients] = useState<RecipientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toInputValue, setToInputValue] = useState(initialTo || '');
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const fromEmail = user?.email || '';
  const fromName = settings?.full_name || user?.user_metadata?.full_name || '';
  const fromDisplay = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      pb.collection('contacts').getFullList({ filter: `user_id = \"${user.id}\"`, fields: 'id, name, email' }).not('email', 'is', null).neq('email', ''),
      pb.collection('clients').getFullList({ filter: `user_id = \"${user.id}\"`, fields: 'id, name, email' }).not('email', 'is', null).neq('email', ''),
    ]).then(([contacts, clients]) => {
      const list: RecipientSuggestion[] = [];
      if (contacts) contacts.forEach(c => { if (c.email) list.push({ id: c.id, name: c.name, email: c.email, type: 'contact' }); });
      if (clients) clients.forEach(c => { if (c.email) list.push({ id: c.id, name: c.name, email: c.email, type: 'client' }); });
      setAllRecipients(list);
    });
  }, [user]);

  useEffect(() => {
    if (!context) return;
    if (context.mode === 'reply') {
      const quotedHtml = `<br/><br/><blockquote><p>On ${context.date}, ${context.fromAddress} wrote:</p>${context.content}</blockquote>`;
      setComposeData({ to: context.fromAddress, cc: '', bcc: '', subject: context.subject.startsWith('Re:') ? context.subject : `Re: ${context.subject}`, html_content: quotedHtml });
      setToInputValue(context.fromAddress);
    } else if (context.mode === 'forward') {
      const forwardHtml = `<br/><br/><p>---------- Forwarded message ----------</p><p>From: ${context.fromAddress}</p><p>Date: ${context.date}</p><p>Subject: ${context.subject}</p><br/>${context.content}`;
      setComposeData({ to: '', cc: '', bcc: '', subject: context.subject.startsWith('Fwd:') ? context.subject : `Fwd: ${context.subject}`, html_content: forwardHtml });
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          toInputRef.current && !toInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToInput = (value: string) => {
    setToInputValue(value);
    setComposeData(prev => ({ ...prev, to: value }));
    const lastPart = value.split(',').pop()?.trim() || '';
    if (lastPart.length >= 1) {
      const query = lastPart.toLowerCase();
      const filtered = allRecipients.filter(r =>
        r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query)
      ).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (r: RecipientSuggestion) => {
    const parts = toInputValue.split(',');
    parts[parts.length - 1] = ` ${r.email}`;
    const newVal = parts.join(',').replace(/^,\s*/, '').trim();
    setToInputValue(newVal);
    setComposeData(prev => ({ ...prev, to: newVal }));
    setShowSuggestions(false);
    toInputRef.current?.focus();
  };

  const findRelatedEntity = async (toAddress: string): Promise<{ entity_id: string; entity_type: string } | null> => {
    const email = toAddress.split(',')[0].trim();
    const { data: contact } = await pb
.collection('contacts').getFirstListItem(`user_id = "${user?.id}" && email = "${email}"`).catch(() => null);
    if (contact) return { entity_id: contact.id, entity_type: 'contact' };
    const { data: client } = await pb
.collection('clients').getFirstListItem(`user_id = "${user?.id}" && email = "${email}"`).catch(() => null);
    if (client) return { entity_id: client.id, entity_type: 'client' };
    return null;
  };

  const buildEmailPayload = (folder: string) => ({
    from_address: fromDisplay,
    to_address: composeData.to,
    cc_address: composeData.cc,
    bcc_address: composeData.bcc,
    subject: composeData.subject,
    html_content: composeData.html_content,
    content: htmlToPlain(composeData.html_content),
    preview: htmlToPlain(composeData.html_content).substring(0, 120),
    date: new Date().toISOString(),
    read: true,
    starred: false,
    has_attachment: false,
    labels: [folder === 'sent' ? 'Sent' : folder === 'drafts' ? 'Draft' : folder],
    folder,
    user_id: user?.id,
    reply_to_id: context?.mode === 'reply' ? context.originalId : null,
    forward_of_id: context?.mode === 'forward' ? context.originalId : null,
  });

  const handleSaveDraft = async () => {
    if (!user) return;
    setSendStatus('saving_draft');
    const payload = buildEmailPayload('drafts');
    if (draftId) {
      const data = await pb.collection('emails').update(draftId, payload).catch(() => null);
      if (data) onDraftSaved(data as Record<string, unknown>);
    } else {
      const data = await pb.collection('emails').create(payload).catch(() => null);
      if (data) {
        setDraftId((data as { id: string }).id);
        onDraftSaved(data as Record<string, unknown>);
      }
    }
    setSendStatus('idle');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSendStatus('sending');
    setSendError('');

    try {
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: composeData.to,
          cc: composeData.cc || undefined,
          bcc: composeData.bcc || undefined,
          subject: composeData.subject,
          html_content: composeData.html_content,
          content: htmlToPlain(composeData.html_content),
          fromName: fromName || undefined,
          fromEmail: fromEmail || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setSendStatus('error');
        setSendError(result.error || 'Failed to send email. Please try again.');
        return;
      }

      if (draftId) {
        await pb.collection('emails').delete(draftId).catch(() => null);
      }

      const payload = buildEmailPayload('sent');
      const savedEmail = await pb.collection('emails').create(payload).catch(() => null);
      if (savedEmail) onSent(savedEmail as Record<string, unknown>);

      const related = await findRelatedEntity(composeData.to);
      await pb.collection('activities').create({
        user_id: user.id,
        type: 'email',
        title: `Email sent: ${composeData.subject}`,
        description: `To: ${composeData.to}${composeData.cc ? ` | CC: ${composeData.cc}` : ''}`,
        entity_id: related?.entity_id || null,
        entity_type: related?.entity_type || 'email',
      });

      setSendStatus('success');
      setTimeout(() => onClose(), 1200);
    } catch {
      setSendStatus('error');
      setSendError('Network error. Please check your connection and try again.');
    }
  };

  const handleTemplateSelect = (tpl: EmailTemplate) => {
    setComposeData(prev => ({
      ...prev,
      subject: tpl.subject || prev.subject,
      html_content: tpl.html_content,
    }));
    setShowTemplates(false);
  };

  const modalTitle = context?.mode === 'reply'
    ? 'Reply'
    : context?.mode === 'forward'
    ? 'Forward'
    : draftId ? 'Edit Draft' : 'New Email';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg md-elevation-4 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
          <div className="bg-primary-700 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-medium text-white">{modalTitle}</h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                title="Use Template"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-100 hover:text-white hover:bg-primary-600 rounded transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Templates
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={sendStatus === 'saving_draft'}
                title="Save Draft"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-100 hover:text-white hover:bg-primary-600 rounded transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {sendStatus === 'saving_draft' ? 'Saving...' : 'Draft'}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pt-3 border-b border-gray-100">
                <div className="flex items-center border-b border-gray-100 pb-2.5">
                  <label className="text-xs font-medium text-gray-400 w-10 flex-shrink-0">From</label>
                  <span className="flex-1 text-sm text-gray-500 truncate py-0.5">{fromDisplay}</span>
                </div>

                <div className="relative border-b border-gray-100 py-2.5">
                  <div className="flex items-center">
                    <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">To</label>
                    <input
                      ref={toInputRef}
                      type="text"
                      placeholder="recipient@example.com"
                      required
                      value={toInputValue}
                      onChange={e => handleToInput(e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      autoComplete="off"
                      className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400 py-0.5"
                    />
                    <div className="flex items-center gap-2 ml-2">
                      {!showCc && (
                        <button type="button" onClick={() => setShowCc(true)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">CC</button>
                      )}
                      {!showBcc && (
                        <button type="button" onClick={() => setShowBcc(true)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">BCC</button>
                      )}
                    </div>
                  </div>
                  {showSuggestions && (
                    <div
                      ref={suggestionsRef}
                      className="absolute left-10 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden"
                    >
                      {suggestions.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onMouseDown={e => { e.preventDefault(); selectSuggestion(r); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                            <p className="text-xs text-gray-500 truncate">{r.email}</p>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.type === 'contact' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                            {r.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {showCc && (
                  <div className="flex items-center border-b border-gray-100 py-2.5">
                    <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">CC</label>
                    <input
                      type="text"
                      placeholder="cc@example.com, another@example.com"
                      value={composeData.cc}
                      onChange={e => setComposeData({ ...composeData, cc: e.target.value })}
                      className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
                    />
                    <button type="button" onClick={() => { setShowCc(false); setComposeData({ ...composeData, cc: '' }); }}
                      className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {showBcc && (
                  <div className="flex items-center border-b border-gray-100 py-2.5">
                    <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">BCC</label>
                    <input
                      type="text"
                      placeholder="bcc@example.com, another@example.com"
                      value={composeData.bcc}
                      onChange={e => setComposeData({ ...composeData, bcc: e.target.value })}
                      className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
                    />
                    <button type="button" onClick={() => { setShowBcc(false); setComposeData({ ...composeData, bcc: '' }); }}
                      className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center py-2.5">
                  <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">Sub</label>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={composeData.subject}
                    onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                    className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="px-5 py-4">
                <RichTextEditor
                  value={composeData.html_content}
                  onChange={html => setComposeData({ ...composeData, html_content: html })}
                  placeholder="Write your message..."
                  minHeight={200}
                />
              </div>
            </div>

            {sendStatus === 'error' && (
              <div className="mx-5 mb-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{sendError}</span>
              </div>
            )}

            {sendStatus === 'success' && (
              <div className="mx-5 mb-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Email sent successfully!</span>
              </div>
            )}

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <button type="button" className="p-2 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Attachments (coming soon)">
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={sendStatus === 'sending' || sendStatus === 'success'}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {sendStatus === 'sending' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : sendStatus === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Sent
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showTemplates && (
        <EmailTemplatesModal
          onClose={() => setShowTemplates(false)}
          onSelect={handleTemplateSelect}
        />
      )}
    </>
  );
};

export default ComposeModal;
