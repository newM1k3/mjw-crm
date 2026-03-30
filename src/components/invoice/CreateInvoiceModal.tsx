import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string;
  description: string;
  quantity: string;
  price: string;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: InvoiceFormData, status: 'Draft' | 'Pending') => void;
}

export interface InvoiceFormData {
  client: string;
  project: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptyItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: '1',
  price: '',
});

const today = new Date().toISOString().split('T')[0];

// ─── Component ────────────────────────────────────────────────────────────────
const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState<InvoiceFormData>({
    client: '',
    project: '',
    issueDate: today,
    dueDate: '',
    lineItems: [emptyItem()],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ client: '', project: '', issueDate: today, dueDate: '', lineItems: [emptyItem()] });
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const updateField = (field: keyof Omit<InvoiceFormData, 'lineItems'>, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const updateItem = (id: string, field: keyof Omit<LineItem, 'id'>, value: string) => {
    setForm(f => ({
      ...f,
      lineItems: f.lineItems.map(item => item.id === id ? { ...item, [field]: value } : item),
    }));
  };

  const addItem = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, emptyItem()] }));

  const removeItem = (id: string) => {
    setForm(f => ({ ...f, lineItems: f.lineItems.filter(item => item.id !== id) }));
  };

  const subtotal = form.lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
  }, 0);

  const handleSubmit = async (status: 'Draft' | 'Pending') => {
    setSaving(true);
    await onSave(form, status);
    setSaving(false);
    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">New Invoice</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Client & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Client *
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Escape Maze"
                value={form.client}
                onChange={e => updateField('client', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Project
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Website Redesign"
                value={form.project}
                onChange={e => updateField('project', e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Issue Date
              </label>
              <input
                type="date"
                className={inputClass}
                value={form.issueDate}
                onChange={e => updateField('issueDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                className={inputClass}
                value={form.dueDate}
                onChange={e => updateField('dueDate', e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Line Items
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Column headers */}
              <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: '1fr 80px 100px 36px' }}>
                {['Description', 'Qty', 'Price', ''].map((h, i) => (
                  <div key={i} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {form.lineItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: '1fr 80px 100px 36px',
                    borderBottom: idx < form.lineItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div className="px-3 py-2">
                    <input
                      className="w-full text-sm bg-transparent focus:outline-none placeholder-gray-400"
                      placeholder="Item description"
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="px-2 py-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full text-sm bg-transparent focus:outline-none text-right placeholder-gray-400"
                      placeholder="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="px-2 py-2 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full text-sm bg-transparent focus:outline-none text-right pl-4 placeholder-gray-400"
                      placeholder="0.00"
                      value={item.price}
                      onChange={e => updateItem(item.id, 'price', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    {form.lineItems.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add line item
            </button>
          </div>

          {/* Subtotal */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Subtotal</p>
              <p className="text-2xl font-light text-gray-900 mt-1">
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit('Draft')}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit('Pending')}
            disabled={saving || !form.client || !form.dueDate}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
