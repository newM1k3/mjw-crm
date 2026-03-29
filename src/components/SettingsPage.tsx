import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Bell, Shield, Palette, Database, Mail, Phone, MapPin, Save,
  Eye, EyeOff, CheckCircle, AlertCircle, Lock, Download, Trash2,
  Monitor, AlignJustify, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import TwoFactorSetup from './settings/TwoFactorSetup';
import DeleteAccountModal from './settings/DeleteAccountModal';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data & Privacy', icon: Database },
];

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const FeedbackBanner: React.FC<{ state: SaveState; message?: string }> = ({ state, message }) => {
  if (state === 'idle') return null;
  if (state === 'saving') return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      Saving changes...
    </div>
  );
  if (state === 'success') return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
      Changes saved successfully
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message || 'Failed to save changes'}
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-primary-700' : 'bg-gray-300'}`}
  >
    <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
  </button>
);

const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors bg-white";

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (val: unknown) => {
    const str = val == null ? '' : String(val).replace(/"/g, '""');
    return `"${str}"`;
  };
  const headerRow = headers.map(escape).join(',');
  const dataRows = rows.map(row => headers.map(h => escape(row[h])).join(','));
  return [headerRow, ...dataRows].join('\n');
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, loading, saveSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('profile');

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', company: '', address: '', bio: '' });
  const [notifForm, setNotifForm] = useState({
    notif_email: true, notif_push: true, notif_client_updates: true,
    notif_meeting_reminders: true, notif_weekly_reports: false,
  });
  const [securityForm, setSecurityForm] = useState({ security_session_timeout: '30', security_password_expiry: '90' });
  const [appearanceForm, setAppearanceForm] = useState({ appearance_theme: 'light', appearance_density: 'comfortable' });
  const [dataForm, setDataForm] = useState({ data_retention: 'forever' });

  const [pwForm, setPwForm] = useState({ next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ next: false, confirm: false });
  const [pwSaveState, setPwSaveState] = useState<SaveState>('idle');
  const [pwError, setPwError] = useState('');

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');

  const [exportLoading, setExportLoading] = useState<'clients' | 'contacts' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    if (!loading) {
      setProfileForm({
        full_name: settings.full_name || user?.user_metadata?.full_name || '',
        phone: settings.phone,
        company: settings.company,
        address: settings.address,
        bio: settings.bio,
      });
      setNotifForm({
        notif_email: settings.notif_email,
        notif_push: settings.notif_push,
        notif_client_updates: settings.notif_client_updates,
        notif_meeting_reminders: settings.notif_meeting_reminders,
        notif_weekly_reports: settings.notif_weekly_reports,
      });
      setSecurityForm({
        security_session_timeout: settings.security_session_timeout,
        security_password_expiry: settings.security_password_expiry,
      });
      setAppearanceForm({
        appearance_theme: settings.appearance_theme,
        appearance_density: settings.appearance_density,
      });
      setDataForm({ data_retention: settings.data_retention });
    }
  }, [loading, settings, user]);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.some(f => f.status === 'verified') ?? false;
      setTwoFactorEnabled(verified);
    });
  }, []);

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    let payload: Record<string, unknown> = {};
    if (activeTab === 'profile') {
      payload = { ...profileForm };
      await supabase.auth.updateUser({ data: { full_name: profileForm.full_name } });
    } else if (activeTab === 'notifications') {
      payload = { ...notifForm };
    } else if (activeTab === 'security') {
      payload = { ...securityForm };
    } else if (activeTab === 'appearance') {
      payload = { ...appearanceForm };
    } else if (activeTab === 'data') {
      payload = { ...dataForm };
    }
    const { error } = await saveSettings(payload as Parameters<typeof saveSettings>[0]);
    if (error) {
      setSaveState('error');
      setSaveError(error);
    } else {
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    setPwSaveState('saving');
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    if (error) {
      setPwSaveState('error');
      setPwError(error.message);
    } else {
      setPwSaveState('success');
      setPwForm({ next: '', confirm: '' });
      setTimeout(() => setPwSaveState('idle'), 3000);
    }
  };

  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportClients = useCallback(async () => {
    if (!user) return;
    setExportLoading('clients');
    const date = new Date().toISOString().split('T')[0];
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, email, phone, company, status, last_contact, starred, created_at')
      .eq('user_id', user.id);
    if (error || !clients || clients.length === 0) {
      alert(error ? error.message : 'No clients found to export.');
      setExportLoading(null);
      return;
    }
    const headers = ['id', 'name', 'email', 'phone', 'company', 'status', 'last_contact', 'starred', 'created_at'];
    downloadCSV(`clients-${date}.csv`, toCSV(headers, clients));
    setExportLoading(null);
  }, [user]);

  const handleExportContacts = useCallback(async () => {
    if (!user) return;
    setExportLoading('contacts');
    const date = new Date().toISOString().split('T')[0];
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, name, email, phone, company, position, location, starred, created_at')
      .eq('user_id', user.id);
    if (error || !contacts || contacts.length === 0) {
      alert(error ? error.message : 'No contacts found to export.');
      setExportLoading(null);
      return;
    }
    const headers = ['id', 'name', 'email', 'phone', 'company', 'position', 'location', 'starred', 'created_at'];
    downloadCSV(`contacts-${date}.csv`, toCSV(headers, contacts));
    setExportLoading(null);
  }, [user]);

  const initials = (profileForm.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{profileForm.full_name || user?.email}</p>
          <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          <p className="text-xs text-gray-400 mt-1">Account ID: {user?.id?.slice(0, 8)}...</p>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3" /> Full Name
            </label>
            <input type="text" value={profileForm.full_name}
              onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className={inputClass} placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email Address
            </label>
            <input type="email" value={user?.email || ''} disabled
              className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone Number
            </label>
            <input type="tel" value={profileForm.phone}
              onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              className={inputClass} placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Company</label>
            <input type="text" value={profileForm.company}
              onChange={e => setProfileForm({ ...profileForm, company: e.target.value })}
              className={inputClass} placeholder="Your company name" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Address
          </label>
          <input type="text" value={profileForm.address}
            onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
            className={inputClass} placeholder="City, Country" />
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Bio</label>
          <textarea value={profileForm.bio}
            onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
            rows={3} className={`${inputClass} resize-none`}
            placeholder="A short bio about yourself..." />
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Notification Preferences</h3>
      {[
        { key: 'notif_email', label: 'Email Notifications', desc: 'Receive notifications via email' },
        { key: 'notif_push', label: 'Push Notifications', desc: 'Receive browser push notifications' },
        { key: 'notif_client_updates', label: 'Client Updates', desc: 'Get notified when clients are updated' },
        { key: 'notif_meeting_reminders', label: 'Meeting Reminders', desc: 'Receive reminders 30 minutes before meetings' },
        { key: 'notif_weekly_reports', label: 'Weekly Reports', desc: 'Receive a weekly activity summary every Monday' },
      ].map(item => (
        <div key={item.key} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
          notifForm[item.key as keyof typeof notifForm] ? 'border-primary-100 bg-primary-50' : 'border-gray-100 bg-gray-50'
        }`}>
          <div>
            <p className="text-sm font-medium text-gray-900">{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
          </div>
          <Toggle
            checked={notifForm[item.key as keyof typeof notifForm] as boolean}
            onChange={v => setNotifForm({ ...notifForm, [item.key]: v })}
          />
        </div>
      ))}
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Two-Factor Authentication</h3>
        <TwoFactorSetup
          isEnabled={twoFactorEnabled}
          onStatusChange={enabled => setTwoFactorEnabled(enabled)}
        />
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Session Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Session Timeout</label>
            <select value={securityForm.security_session_timeout}
              onChange={e => setSecurityForm({ ...securityForm, security_session_timeout: e.target.value })}
              className={inputClass}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="480">8 hours</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password Expiry Reminder</label>
            <select value={securityForm.security_password_expiry}
              onChange={e => setSecurityForm({ ...securityForm, security_password_expiry: e.target.value })}
              className={inputClass}>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-4 mb-1">
            <FeedbackBanner state={saveState} message={saveError} />
          </div>
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 transition-colors"
          >
            {saveState === 'saving' ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
            ) : (
              <><Save className="w-4 h-4" />Save Session Settings</>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3" /> New Password
            </label>
            <div className="relative">
              <input
                type={showPw.next ? 'text' : 'password'}
                value={pwForm.next}
                onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                className={`${inputClass} pr-10`}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw(p => ({ ...p, next: !p.next }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwForm.next && (
              <div className="mt-2 flex gap-1">
                {[...Array(4)].map((_, i) => {
                  const strength = Math.min(
                    Math.floor(pwForm.next.length / 3) +
                    (/[A-Z]/.test(pwForm.next) ? 1 : 0) +
                    (/[0-9]/.test(pwForm.next) ? 1 : 0) +
                    (/[^A-Za-z0-9]/.test(pwForm.next) ? 1 : 0), 4
                  );
                  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
                  return (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength ? colors[strength - 1] : 'bg-gray-200'}`} />
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPw.confirm ? 'text' : 'password'}
                value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                className={`${inputClass} pr-10 ${
                  pwForm.confirm && pwForm.next !== pwForm.confirm ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
            {pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.confirm.length > 0 && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>
          {pwError && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{pwError}
            </div>
          )}
          {pwSaveState === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Password updated successfully
            </div>
          )}
          <button
            type="submit"
            disabled={pwSaveState === 'saving' || !pwForm.next || !pwForm.confirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {pwSaveState === 'saving' ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating...</>
            ) : (
              <><Lock className="w-4 h-4" />Update Password</>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Theme</h3>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {[
            { value: 'light', label: 'Light', preview: 'bg-white border-gray-200' },
            { value: 'dark', label: 'Dark (Soon)', preview: 'bg-gray-900 border-gray-700', disabled: true },
          ].map(t => (
            <button key={t.value} type="button" disabled={t.disabled}
              onClick={() => !t.disabled && setAppearanceForm({ ...appearanceForm, appearance_theme: t.value })}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                appearanceForm.appearance_theme === t.value ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${t.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`w-12 h-8 rounded ${t.preview} border flex items-center justify-center`}>
                <Monitor className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-xs font-medium text-gray-700">{t.label}</span>
              {appearanceForm.appearance_theme === t.value && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Interface Density</h3>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {[
            { value: 'comfortable', label: 'Comfortable', desc: 'More breathing room' },
            { value: 'compact', label: 'Compact', desc: 'See more at once' },
          ].map(d => (
            <button key={d.value} type="button"
              onClick={() => setAppearanceForm({ ...appearanceForm, appearance_density: d.value })}
              className={`flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                appearanceForm.appearance_density === d.value ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <AlignJustify className={`w-4 h-4 ${appearanceForm.appearance_density === d.value ? 'text-primary-600' : 'text-gray-400'}`} />
                {appearanceForm.appearance_density === d.value && <CheckCircle className="w-3.5 h-3.5 text-primary-600" />}
              </div>
              <span className="text-xs font-semibold text-gray-800 mt-1">{d.label}</span>
              <span className="text-xs text-gray-500">{d.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderData = () => (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Data Management</h3>

        <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 mb-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Export Data as CSV</p>
            <p className="text-xs text-gray-500 mt-0.5">Download your clients or contacts as individual CSV files</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Clients</p>
                  <p className="text-xs text-gray-500">clients.csv</p>
                </div>
              </div>
              <button
                onClick={handleExportClients}
                disabled={exportLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 transition-colors flex-shrink-0"
              >
                {exportLoading === 'clients' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {exportLoading === 'clients' ? 'Exporting...' : 'Export'}
              </button>
            </div>
            <div className="flex-1 flex items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Contacts</p>
                  <p className="text-xs text-gray-500">contacts.csv</p>
                </div>
              </div>
              <button
                onClick={handleExportContacts}
                disabled={exportLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 transition-colors flex-shrink-0"
              >
                {exportLoading === 'contacts' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {exportLoading === 'contacts' ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-1">Data Retention</p>
          <p className="text-xs text-gray-500 mb-3">How long to retain your activity history and logs</p>
          <select
            value={dataForm.data_retention}
            onChange={e => setDataForm({ data_retention: e.target.value })}
            className={`${inputClass} max-w-xs`}
          >
            <option value="1year">1 Year</option>
            <option value="2years">2 Years</option>
            <option value="5years">5 Years</option>
            <option value="forever">Forever</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-4">Danger Zone</h3>
        <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-900 mb-1">Delete Account</p>
          <p className="text-xs text-red-700 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfile();
      case 'notifications': return renderNotifications();
      case 'security': return renderSecurity();
      case 'appearance': return renderAppearance();
      case 'data': return renderData();
      default: return renderProfile();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="bg-primary-700 px-6 py-4 flex-shrink-0">
        <h2 className="text-xl font-medium text-white">Settings</h2>
        <p className="text-sm text-blue-200 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        <div className="sm:w-52 border-b sm:border-b-0 sm:border-r border-gray-200 bg-gray-50 flex-shrink-0">
          <nav className="py-2 flex sm:flex-col overflow-x-auto sm:overflow-x-visible">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSaveState('idle'); }}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 whitespace-nowrap flex-shrink-0 relative ${
                    activeTab === tab.id
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {activeTab === tab.id && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-700 sm:block hidden" />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${activeTab === tab.id ? 'text-primary-700' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}

          {activeTab !== 'security' && (
            <div className="mt-8 pt-5 border-t border-gray-100 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saveState === 'saving'}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 disabled:opacity-60 transition-colors"
              >
                {saveState === 'saving' ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4" />Save Changes</>
                )}
              </button>
              <FeedbackBanner state={saveState} message={saveError} />
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          userEmail={user?.email || ''}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

export default SettingsPage;
