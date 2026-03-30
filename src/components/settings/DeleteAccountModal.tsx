import React, { useState } from 'react';
import { AlertTriangle, X, Trash2, AlertCircle } from 'lucide-react';
import { pb } from '../../lib/pocketbase';

interface DeleteAccountModalProps {
  userEmail: string;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ userEmail, onClose, onDeleted }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const required = 'delete my account';
  const canDelete = confirmText.toLowerCase() === required;

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError('');

    if (!pb.authStore.isValid || !pb.authStore.model) {
      setError('Not authenticated.');
      setLoading(false);
      return;
    }

    try {
      // Delete the user record — PocketBase will cascade-delete related data
      // if collection rules and cascade deletes are configured in PocketBase admin
      await pb.collection('users').delete(pb.authStore.model.id);
      pb.authStore.clear();
      onDeleted();
    } catch (err: any) {
      setError(err?.response?.message || err.message || 'Failed to delete account. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Delete Account</h3>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-900 mb-2">This action is permanent and irreversible.</p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>All your clients and contacts will be deleted</li>
              <li>All emails, calendar events, and activities will be deleted</li>
              <li>All tags and settings will be deleted</li>
              <li>Your account <span className="font-semibold">{userEmail}</span> will be permanently removed</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              To confirm, type <span className="font-mono font-semibold text-red-600">delete my account</span> below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-colors"
              placeholder="delete my account"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4" />Delete My Account</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
