import React, { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardPage from './components/DashboardPage';
import ClientList from './components/ClientList';
import ActivityFeed from './components/ActivityFeed';
import ContactDetail from './components/ContactDetail';
import EditClientModal from './components/EditClientModal';
import ContactsPage from './components/ContactsPage';
import CalendarPage from './components/CalendarPage';
import EmailsPage from './components/EmailsPage';
import TagsPage from './components/TagsPage';
import InvoicesPage from './components/InvoicesPage';
import SettingsPage from './components/SettingsPage';
import AuthPage from './components/AuthPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AddClientModal from './components/AddClientModal';
import AddContactModal from './components/AddContactModal';
import FAB from './components/FAB';
import EventModal from './components/calendar/EventModal';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { pb, ensureAuth } from './lib/pocketbase';
import { logActivity } from './lib/activity';

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
}

function App() {
  const { user, loading } = useAuth();
  const { settings } = useSettings();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingComposeEmail, setPendingComposeEmail] = useState<string | null>(null);
  const clientListRefreshRef = useRef<(() => void) | null>(null);
  const [fabAddClientOpen, setFabAddClientOpen] = useState(false);
  const [fabAddContactOpen, setFabAddContactOpen] = useState(false);
  const [fabNewEventOpen, setFabNewEventOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.appearance_density === 'compact') {
      root.classList.add('density-compact');
    } else {
      root.classList.remove('density-compact');
    }
  }, [settings.appearance_density]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (window.location.hash.includes('reset-password') || window.location.hash.includes('type=recovery')) {
    return <ResetPasswordPage onDone={() => { window.location.hash = ''; }} />;
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleClientSaved = (updated: Client) => {
    if (selectedClient?.id === updated.id) {
      setSelectedClient(updated);
    }
    clientListRefreshRef.current?.();
  };

  const handleDeleteRequest = (client: Client) => {
    setDeleteConfirmClient(client);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmClient) return;
    setDeleting(true);
    try { await ensureAuth(); } catch { setDeleting(false); return; }
    await pb.collection('clients').delete(deleteConfirmClient.id);
    if (user) {
      await logActivity({
        userId: user.id,
        type: 'client_deleted',
        title: `Client removed: ${deleteConfirmClient.name}`,
        description: deleteConfirmClient.company ? `from ${deleteConfirmClient.company}` : '',
        entityType: 'client',
      });
    }
    setDeleting(false);
    setDeleteConfirmClient(null);
    if (selectedClient?.id === deleteConfirmClient.id) {
      setSelectedClient(null);
    }
    clientListRefreshRef.current?.();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardPage
            onEmailClient={(email) => { setPendingComposeEmail(email); setActiveSection('emails'); }}
            onNavigate={(section) => setActiveSection(section)}
            onViewClient={(clientId) => {
              setActiveSection('clients');
              // Select the client by fetching from PocketBase
              pb.collection('clients').getOne(clientId).then((rec) => setSelectedClient(rec as any)).catch(() => {});
            }}
          />
        );
      case 'clients':
        return (
          <>
            <ClientList
              onSelectClient={setSelectedClient}
              selectedClientId={selectedClient?.id || null}
              registerRefresh={(fn) => { clientListRefreshRef.current = fn; }}
            />
            <ActivityFeed />
          </>
        );
      case 'contacts':
        return <ContactsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'emails':
        return <EmailsPage initialComposeTo={pendingComposeEmail} onComposeClear={() => setPendingComposeEmail(null)} />;
      case 'invoices':
        return <InvoicesPage />;
      case 'tags':
        return <TagsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            onEmailClient={(email) => { setPendingComposeEmail(email); setActiveSection('emails'); }}
            onNavigate={(section) => setActiveSection(section)}
            onViewClient={(clientId) => {
              setActiveSection('clients');
              pb.collection('clients').getOne(clientId).then((rec) => setSelectedClient(rec as any)).catch(() => {});
            }}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-primary-700 h-14 flex items-center px-4 gap-3 md-elevation-2">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 rounded text-white hover:bg-primary-600 transition-colors duration-200 -ml-1"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-medium text-white">MJW Design</h1>
      </div>

      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden pt-14 lg:pt-0">
        {renderContent()}
      </div>

      {activeSection === 'clients' && (
        <ContactDetail
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={setEditingClient}
          onDelete={handleDeleteRequest}
          onEmailClient={(email) => {
            setPendingComposeEmail(email);
            setActiveSection('emails');
          }}
        />
      )}

      <EditClientModal
        client={editingClient}
        onClose={() => setEditingClient(null)}
        onSaved={handleClientSaved}
      />

      <FAB
        onAddClient={() => setFabAddClientOpen(true)}
        onAddContact={() => setFabAddContactOpen(true)}
        onNewEvent={() => setFabNewEventOpen(true)}
      />

      {/* FAB: Add Client — AddClientModal now owns the PocketBase create call.
          On success it returns the new record; we close the modal and refresh
          the ClientList so the new entry appears immediately. */}
      <AddClientModal
        isOpen={fabAddClientOpen}
        onClose={() => setFabAddClientOpen(false)}
        onAddClient={(_newClient) => {
          setFabAddClientOpen(false);
          clientListRefreshRef.current?.();
        }}
      />

      <AddContactModal
        isOpen={fabAddContactOpen}
        onClose={() => setFabAddContactOpen(false)}
        onAdded={() => setFabAddContactOpen(false)}
      />

      <EventModal
        isOpen={fabNewEventOpen}
        onClose={() => setFabNewEventOpen(false)}
        onSaved={() => setFabNewEventOpen(false)}
      />

      {deleteConfirmClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Delete Client</h3>
                  <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-6">
                Are you sure you want to delete <span className="font-semibold">{deleteConfirmClient.name}</span>? All associated data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmClient(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors duration-200 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
