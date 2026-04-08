import React, { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { pb, ensureAuth } from '../../lib/pocketbase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activity';

type ImportStep = 'paste' | 'preview' | 'importing' | 'done';

interface ParsedContact {
  _id: string;
  _removed: boolean;
  _duplicate: boolean;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  location: string;
}

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

const ImportContactsModal: React.FC<ImportContactsModalProps> = ({ isOpen, onClose, onImported }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<ImportStep>('paste');
  const [rawText, setRawText] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState<{ id: string; name: string; company: string }[]>([]);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !user) return;
    setStep('paste');
    setRawText('');
    setSelectedClientId('');
    setContacts([]);
    setParsing(false);
    setParseError('');
    setImportProgress(0);
    setImportTotal(0);
    setSuccessCount(0);
    setFailCount(0);

    pb.collection('clients')
      .getFullList({ filter: `user_id = '${user.id}'`, sort: 'name' })
      .then(data => {
        if (data) setClients(data as { id: string; name: string; company: string }[]);
      })
      .catch(() => {});
  }, [isOpen, user]);

  const handleParse = async () => {
    setParsing(true);
    setParseError('');
    try {
      const res = await fetch('/.netlify/functions/parse-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');

      // Duplicate detection against existing contacts
      const existing = await pb.collection('contacts')
        .getFullList({ filter: `user_id = '${user!.id}'`, fields: 'email' });
      const existingEmails = new Set(
        existing.map((c: any) => (c.email || '').toLowerCase()).filter(Boolean)
      );

      const parsed: ParsedContact[] = (data.contacts || []).map((c: any) => ({
        _id: crypto.randomUUID(),
        _removed: false,
        _duplicate: !!(c.email && existingEmails.has(c.email.toLowerCase())),
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        position: c.position || '',
        location: c.location || '',
      }));

      setContacts(parsed);
      setStep('preview');
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse contacts. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    const toImport = contacts.filter(c => !c._removed);
    setImportTotal(toImport.length);
    setImportProgress(0);
    setSuccessCount(0);
    setFailCount(0);
    setStep('importing');

    let success = 0;
    let fail = 0;

    for (let i = 0; i < toImport.length; i++) {
      const contact = toImport[i];
      try {
        await ensureAuth();
        await pb.collection('contacts').create({
          user_id: user!.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          position: contact.position,
          location: contact.location,
          starred: false,
          tags: [],
          client_id: selectedClientId || null,
        });
        success++;
      } catch {
        fail++;
      }
      setImportProgress(i + 1);
    }

    // Single summary activity log
    if (success > 0) {
      await logActivity({
        userId: user!.id,
        type: 'contact_added',
        title: `Bulk imported ${success} contact${success === 1 ? '' : 's'}`,
        description: selectedClientId ? 'linked to client' : '',
        entityType: 'contact',
      });
    }

    setSuccessCount(success);
    setFailCount(fail);
    setStep('done');
  };

  const updateContact = (id: string, field: string, value: string) => {
    setContacts(prev => prev.map(c => c._id === id ? { ...c, [field]: value } : c));
  };

  const toggleRemove = (id: string) => {
    setContacts(prev => prev.map(c => c._id === id ? { ...c, _removed: !c._removed } : c));
  };

  if (!isOpen) return null;

  const activeCount = contacts.filter(c => !c._removed).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-blue-200" />
            <h2 className="text-base font-medium text-white">Import Contacts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1 — PASTE */}
        {step === 'paste' && (
          <div className="p-6">
            <p className="text-xs text-gray-500 mb-4">Step 1 of 2 — Paste your contacts</p>

            <textarea
              rows={8}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Paste any text containing contact info — emails, LinkedIn profiles, business card text, spreadsheet rows, name lists. Claude will extract the contacts automatically."
              className="w-full p-3 border border-gray-300 rounded text-sm resize-none outline-none focus:border-primary-700 transition-colors font-mono"
            />

            {parseError && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {parseError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Associate all with a client (optional)
              </label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
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

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParse}
                disabled={!rawText.trim() || parsing}
                className="flex-1 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {parsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Parsing...
                  </>
                ) : (
                  'Parse with AI'
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — PREVIEW */}
        {step === 'preview' && (
          <div className="p-6">
            <p className="text-xs text-gray-500 mb-4">Step 2 of 2 — Review and confirm</p>

            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm mb-4">
              Found {activeCount} contacts ready to import.
            </div>

            {contacts.some(c => c._duplicate && !c._removed) && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 text-sm mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {contacts.filter(c => c._duplicate && !c._removed).length} contacts have email
                  addresses already in your CRM and are highlighted below.
                </span>
              </div>
            )}

            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200 rounded">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.map(contact => (
                    <tr
                      key={contact._id}
                      className={
                        contact._removed
                          ? 'opacity-40 line-through'
                          : contact._duplicate
                            ? 'bg-yellow-50'
                            : ''
                      }
                    >
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full text-sm text-gray-900 outline-none bg-transparent focus:bg-white focus:border focus:border-primary-300 rounded px-1 py-0.5"
                          value={contact.name}
                          onChange={e => updateContact(contact._id, 'name', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full text-sm text-gray-900 outline-none bg-transparent focus:bg-white focus:border focus:border-primary-300 rounded px-1 py-0.5"
                          value={contact.email}
                          onChange={e => updateContact(contact._id, 'email', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full text-sm text-gray-900 outline-none bg-transparent focus:bg-white focus:border focus:border-primary-300 rounded px-1 py-0.5"
                          value={contact.phone}
                          onChange={e => updateContact(contact._id, 'phone', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full text-sm text-gray-900 outline-none bg-transparent focus:bg-white focus:border focus:border-primary-300 rounded px-1 py-0.5"
                          value={contact.company}
                          onChange={e => updateContact(contact._id, 'company', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full text-sm text-gray-900 outline-none bg-transparent focus:bg-white focus:border focus:border-primary-300 rounded px-1 py-0.5"
                          value={contact.position}
                          onChange={e => updateContact(contact._id, 'position', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full text-sm text-gray-900 outline-none bg-transparent focus:bg-white focus:border focus:border-primary-300 rounded px-1 py-0.5"
                          value={contact.location}
                          onChange={e => updateContact(contact._id, 'location', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        {contact._removed ? (
                          <span className="text-xs text-gray-400">Removed</span>
                        ) : contact._duplicate ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Duplicate</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Ready</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {contact._removed ? (
                          <button
                            onClick={() => toggleRemove(contact._id)}
                            className="text-xs text-primary-700 hover:underline"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleRemove(contact._id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('paste')}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={activeCount === 0}
                className="flex-1 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Import {activeCount} contacts
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — IMPORTING */}
        {step === 'importing' && (
          <div className="py-16 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Importing contacts...</p>
              <p className="text-xs text-gray-500 mt-1">{importProgress} of {importTotal}</p>
            </div>
            <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-700 rounded-full transition-all duration-300"
                style={{ width: `${(importProgress / importTotal) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 4 — DONE */}
        {step === 'done' && (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                Import complete
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Successfully imported {successCount} contact{successCount === 1 ? '' : 's'}
              </p>
              {failCount > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {failCount} contact{failCount === 1 ? '' : 's'} could not be imported
                </p>
              )}
            </div>
            <button
              onClick={() => { onImported(successCount); onClose(); }}
              className="px-6 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportContactsModal;
