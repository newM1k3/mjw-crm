import React, { createContext, useContext, useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { pb } from '../lib/pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Seed initial state from the persisted auth store so the UI is never
  // momentarily unauthenticated on a hard refresh.
  const [user, setUser] = useState<RecordModel | null>(
    pb.authStore.isValid ? (pb.authStore.model as RecordModel) : null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate the persisted token against PocketBase on mount.
    // If the token is still valid this silently refreshes it; if it has
    // expired the catch block clears the store and forces a re-login.
    if (pb.authStore.isValid && pb.authStore.model) {
      pb.collection('users')
        .authRefresh()
        .then(({ record }) => {
          setUser(record);
        })
        .catch(() => {
          pb.authStore.clear();
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Keep React state in sync whenever the auth store changes (e.g. after
    // login, logout, or a token refresh triggered by ensureAuth()).
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(model as RecordModel | null);
    });

    return () => { unsubscribe(); };
  }, []);

  const signOut = async () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
