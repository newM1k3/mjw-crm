import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, Eye, DollarSign, TrendingUp, Clock, Trash2, AlertCircle } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import CreateInvoiceModal, { InvoiceFormData } from './invoice/CreateInvoiceModal';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  invoice_number: string;
  client: string;
  project: string;
  amount: number;
  status: 'Draft' | 'Pending' | 'Paid' | 'Overdue';
  issue_date: string;
  due_date: string;
  line_items: LineItem[];
  user_id: string;
  created: string;
  updated: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: string;
  price: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusStyles: Record<string, { chip: string; dot: string }> = {
  Paid:    { chip: 'bg-green-100 text-green-800',  dot: 'bg-green-500' },
  Pending: { chip: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  Overdue: { chip: 'bg-red-100 text-red-800',      dot: 'bg-red-500' },
  Draft:   { chip: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
};

function fmt(num: number) {
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateInvoiceNumber(existing: Invoice[]) {
  const year = new Date().getFullYear();
  const count = existing.filter(i => i.invoice_number?.startsWith(`INV-${year}-`)).length;
  return `INV-${year}-${String(count + 1).padStart(3, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load invoices from PocketBase ──────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const records = await pb.collection('invoices').getFullList<Invoice>({
        filter: `user_id = "${user.id}"`,
        sort: '-created',
      });
      setInvoices(records);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load invoices';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // ── Create invoice ─────────────────────────────────────────────────────────
  const handleSave = async (data: InvoiceFormData, status: 'Draft' | 'Pending') => {
    if (!user) return;
    const subtotal = data.lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
    }, 0);
    try {
      await pb.collection('invoices').create({
        invoice_number: generateInvoiceNumber(invoices),
        client: data.client || 'Unknown Client',
        project: data.project || 'Untitled Project',
        amount: subtotal,
        status,
        issue_date: data.issueDate || new Date().toISOString().split('T')[0],
        due_date: data.dueDate || new Date().toISOString().split('T')[0],
        line_items: data.lineItems,
        user_id: user.id,
      });
      await loadInvoices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create invoice';
      setError(msg);
    }
  };

  // ── Delete invoice ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await pb.collection('invoices').delete(deleteConfirm.id);
      setDeleteConfirm(null);
      await loadInvoices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete invoice';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Mark as Paid ───────────────────────────────────────────────────────────
  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      await pb.collection('invoices').update(invoice.id, { status: 'Paid' });
      await loadInvoices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update invoice';
      setError(msg);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const matchSearch =
      inv.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterStatus === 'all' || inv.status?.toLowerCase() === filterStatus;
    return matchSearch && matchFilter;
  });

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmount   = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
  const outstanding  = invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue').reduce((s, i) => s + (i.amount || 0), 0);

  const stats = [
    { label: 'Total Revenue',  value: fmt(totalRevenue), icon: DollarSign, color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Paid',           value: fmt(paidAmount),   icon: TrendingUp, color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Outstanding',    value: fmt(outstanding),  icon: Clock,      color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Invoices</h2>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors duration-150 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-light text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search & filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices, clients, projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white sm:w-40"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading invoices...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-medium text-gray-900">No invoices found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {invoices.length === 0 ? 'Create your first invoice to get started.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Invoice #', 'Client', 'Project', 'Amount', 'Status', 'Due Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => {
                  const style = statusStyles[inv.status] || statusStyles.Draft;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors duration-100">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-gray-700">{inv.invoice_number}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{inv.client}</td>
                      <td className="px-4 py-3 text-gray-900">{inv.project}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{fmt(inv.amount || 0)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {inv.status !== 'Paid' && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              title="Mark as Paid"
                              className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(inv)}
                            title="Delete invoice"
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Invoice</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-mono font-medium">{deleteConfirm.invoice_number}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
