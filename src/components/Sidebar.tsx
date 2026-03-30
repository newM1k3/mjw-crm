import React from 'react';
import { LayoutDashboard, Users, Phone, Calendar, Settings, Tags, Mail, X, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'contacts', label: 'Contacts', icon: Phone },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'tags', label: 'Tags', icon: Tags },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const getInitials = (name: string, email: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return email ? email[0].toUpperCase() : '?';
};

const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection, isMobileOpen, setIsMobileOpen }) => {
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const initials = getInitials(user?.user_metadata?.full_name || '', displayEmail);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setIsMobileOpen(false);
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white h-screen flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none md-elevation-2 lg:shadow-none ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="bg-primary-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-medium text-white tracking-wide">MJW Design</h1>
            <p className="text-xs text-blue-200 mt-0.5 font-normal">CRM Dashboard</p>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all duration-150 relative md-ripple ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-700 rounded-r" />
                )}
                <Icon className={`w-5 h-5 mr-4 flex-shrink-0 ${isActive ? 'text-primary-700' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
