import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import { useAuth } from './AuthContext';

export interface UserSettings {
  full_name: string;
  phone: string;
  company: string;
  address: string;
  bio: string;
  avatar_url: string;
  notif_email: boolean;
  notif_push: boolean;
  notif_client_updates: boolean;
  notif_meeting_reminders: boolean;
  notif_weekly_reports: boolean;
  security_session_timeout: string;
  security_password_expiry: string;
  appearance_theme: string;
  appearance_density: string;
  data_retention: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  full_name: '',
  phone: '',
  company: '',
  address: '',
  bio: '',
  avatar_url: '',
  notif_email: true,
  notif_push: true,
  notif_client_updates: true,
  notif_meeting_reminders: true,
  notif_weekly_reports: false,
  security_session_timeout: '30',
  security_password_expiry: '90',
  appearance_theme: 'light',
  appearance_density: 'comfortable',
  data_retention: 'forever',
};

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  saveSettings: (partial: Partial<UserSettings>) => Promise<{ error: string | null }>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  saveSettings: async () => ({ error: null }),
  refreshSettings: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [recordId, setRecordId] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    if (!user) return;
    try {
      const records = await pb.collection('user_settings').getList(1, 1, {
        filter: `user_id = "${user.id}"`,
      });
      if (records.items.length > 0) {
        const data = records.items[0];
        setRecordId(data.id);
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } else {
        setSettings({
          ...DEFAULT_SETTINGS,
          full_name: (user as any).name || '',
        });
      }
    } catch {
      setSettings({ ...DEFAULT_SETTINGS, full_name: (user as any).name || '' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    refreshSettings();
  }, [refreshSettings]);

  const saveSettings = useCallback(async (partial: Partial<UserSettings>): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    const merged = { ...settings, ...partial };
    try {
      if (recordId) {
        await pb.collection('user_settings').update(recordId, { ...merged, user_id: user.id });
      } else {
        const created = await pb.collection('user_settings').create({ ...merged, user_id: user.id });
        setRecordId(created.id);
      }
      setSettings(merged);
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to save settings' };
    }
  }, [user, settings, recordId]);

  return (
    <SettingsContext.Provider value={{ settings, loading, saveSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
